import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class correct_vocabulary_word extends Document {
  @Prop({ required: true })
  original_text: string;

  @Prop({ required: true })
  user_id: string;

  @Prop({ required: true })
  content_id: string;

  @Prop({ required: true })
  milestone_level: string;

  @Prop({ required: true })
  practice_level: string;

  @Prop({ required: true })
  session_id: string;

  @Prop({ required: true })
  subsession_id: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export type correct_vocabulary_wordDocument = correct_vocabulary_word & Document;

export const correct_vocabulary_wordSchema =
  SchemaFactory.createForClass(correct_vocabulary_word); 