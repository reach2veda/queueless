import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: [true, 'Counter key is required'],
      unique: true,
      trim: true,
      index: true,
    },
    seq: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Counter = mongoose.model('Counter', counterSchema);
export default Counter;

