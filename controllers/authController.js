import bcrypt from 'bcryptjs';
import User from "../models/User.js";


export const register = async (req, res) => {
    try{
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters' });
        }



        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const saltRounds = Number(process.env.SALT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const user = new User({
            name,
            email,
            password: hashedPassword
        });
        await user.save();

          const safeUser = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            createdAt: user.createdAt
        };
        return res.status(201).json({ message: "User created", user: safeUser });

    }catch (err) {
    console.error("Register error:", err);

    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already exists" });
    }

    return res.status(500).json({ message: "Server error" });
  }
};
    