var cluster = require('cluster');
import * as os from 'os';
import { Injectable } from '@nestjs/common';

const parsedConcurrency = process.env.WEB_CONCURRENCY
  ? parseInt(process.env.WEB_CONCURRENCY, 10)
  : 1;
const numWorkers =
  Number.isFinite(parsedConcurrency) && parsedConcurrency > 0
    ? parsedConcurrency
    : 1;

@Injectable()
export class AppClusterService {
  static clusterize(callback: Function): void {
    if (numWorkers > 1 && cluster.isMaster) {
      console.log(`Master server started on ${process.pid} with ${numWorkers} workers`);
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
