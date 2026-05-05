import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    pharmacyId: { type: String, required: false },
    role: { type: String, enum: ['master', 'employee'], default: 'employee' },
    baseSalary: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
}, { timestamps: true });

export const getUserModel = (conn) => {
  if (conn.models.User) {
    delete conn.models.User;
  }

  return conn.model('User', UserSchema);
};
