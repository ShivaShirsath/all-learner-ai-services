var cluster = require('cluster');
import * as fs from 'fs';
import * as os from 'os';
import { Injectable } from '@nestjs/common';

/**
 * CPUs this container may actually use. os.cpus() reports the *host's* cores
 * inside a container, so a pod limited to 2 vCPU on a 32-core node would fork
 * 32 workers, each with its own MongoDB pool. Reads the cgroup quota (v2, then
 * v1) and falls back to os.cpus().
 */
function containerCpuLimit(): number {
  try {
    const [quota, period] = fs
      .readFileSync('/sys/fs/cgroup/cpu.max', 'utf8')
      .trim()
      .split(/\s+/);
    if (quota !== 'max') {
      return Math.max(1, Math.floor(Number(quota) / Number(period)));
    }
  } catch {
    /* not cgroup v2 */
  }
  try {
    const quota = Number(
      fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_quota_us', 'utf8'),
    );
    const period = Number(
      fs.readFileSync('/sys/fs/cgroup/cpu/cpu.cfs_period_us', 'utf8'),
    );
    if (quota > 0 && period > 0) {
      return Math.max(1, Math.floor(quota / period));
    }
  } catch {
    /* not cgroup v1 */
  }
  return os.cpus().length || 1;
}

/** WORKERS env var wins; otherwise the container CPU limit. */
export function workerCount(): number {
  const fromEnv = parseInt(process.env.WORKERS ?? '', 10);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : containerCpuLimit();
}

@Injectable()
export class AppClusterService {
  static clusterize(callback: Function): void {
    if (cluster.isMaster) {
      const numWorkers = workerCount();
      console.log(`Master server started on ${process.pid}, forking ${numWorkers} workers`);
      for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
      }
      cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died. Restarting`);
        cluster.fork();
      });
    } else {
      console.log(`Cluster server started on ${process.pid}`);
      callback();
    }
  }
}
