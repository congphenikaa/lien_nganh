import mongoose from "mongoose";


const userSchema = new mongoose.Schema(
    {
        _id: {type: String, require: true},
        name: {type: String, require: true},
        email: {type: String, require: true},
        imageUrl: {type: String, default: ''},
        clerkId: {type: String, require: true}, // Clerk user ID for role management
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