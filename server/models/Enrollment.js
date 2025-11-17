import mongoose from "mongoose";

const EnrollmentSchema = new mongoose.Schema({
  student: { 
    type: String, 
    ref: 'User', 
    required: true 
  },
  course: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Course', 
    required: true 
  },
  enrolledAt: { 
    type: Date, 
    default: Date.now 
  },
  enrollmentType: {
    type: String,
    enum: ['purchase', 'manual', 'promotion'],
    default: 'purchase'
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'completed'],
    default: 'active'
  }
}, { timestamps: true });

// Index for faster queries
EnrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
EnrollmentSchema.index({ course: 1 });

const Enrollment = mongoose.model('Enrollment', EnrollmentSchema);

export default Enrollment;
