import mongoose from "mongoose";


const userSchema = new mongoose.Schema(
    {
        _id: {type: String, required: true},
        name: {type: String, required: true},
        email: {type: String, required: true},
        imageUrl: {type: String, default: ''},
        clerkId: {type: String, required: true}, // Clerk user ID for role management
        role: {
            type: String,
            enum: ['student', 'educator', 'admin'],
            default: 'student' // Optional cache field, actual role comes from Clerk
        },
        enrolledCourses: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Course'
            }
        ],
    }, {timestamps: true});
    const User = mongoose.model('User', userSchema);
    export default User