import mongoose from "mongoose";

const educatorRequestSchema = new mongoose.Schema({
    userId: {
        type: String,
        ref: 'User',
        required: true
    },
    fullName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    education: {
        type: String,
        required: true
    },
    experience: {
        type: String,
        required: true
    },
    specialization: {
        type: String,
        required: true
    },
    teachingExperience: {
        type: String,
        required: true
    },
    motivation: {
        type: String,
        required: true
    },
    portfolio: {
        type: String,
        default: ''
    },
    certificates: [{
        name: String,
        url: String
    }],
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    reviewedBy: {
        type: String,
        ref: 'User',
        default: null
    },
    reviewDate: {
        type: Date,
        default: null
    },
    reviewNote: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const EducatorRequest = mongoose.model('EducatorRequest', educatorRequestSchema);
export default EducatorRequest;