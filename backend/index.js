const express = require("express");
const cors = require("cors");
const { default: mongoose } = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cookieParser = require("cookie-parser");
const { Configuration, OpenAIApi } = require("openai");
const User = require("./models/User");
const Personal = require("./models/Personal");
const Objective = require("./models/Objective");
const Experience = require("./models/Experience");
const Education = require("./models/Education");
const Skills = require("./models/Skills");
const Projects = require("./models/Projects");
const Certification = require("./models/Certification");
const Reference = require("./models/Reference");
const app = express();
require("dotenv").config();
const port = 4002;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log("MongoDB connected successfully!"))
  .catch(err => console.error("MongoDB connection error:", err));

const config = new Configuration({
  organization: "org-t2jndfDjhw0g6mCXrCSiRfev",
  apiKey: process.env.OPEN_AI_API_KEY,
});
const openai = new OpenAIApi(config);

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const jwtSecret = "95fc4400064d0d3932fc8ad9f67041d84d48b1832ece4a9a6bb2b124e471a666b8978e74d6f0d251206394149b975faed7c525d76dd292b50b9e67fe830f3c31";
const bcryptSalt = bcrypt.genSaltSync(10);

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json("Test Ok");
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const userData = await new Promise((resolve, reject) => {
      jwt.verify(token, jwtSecret, {}, (err, data) => {
        if (err) reject(err);
        resolve(data);
      });
    });

    req.user = userData;
    next();
  } catch (err) {
    console.error("Authentication error:", err);
    return res.status(401).json({ error: "Invalid token" });
  }
};

// Register endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    // Create new user
    const userData = await User.create({
      username,
      email,
      password: bcrypt.hashSync(password, bcryptSalt),
    });

    res.status(201).json({
      id: userData._id,
      username: userData.username,
      email: userData.email
    });
  } catch (e) {
    console.error("Registration error:", e);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const userData = await User.findOne({ username });
    
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }

    const passOk = bcrypt.compareSync(password, userData.password);
    if (!passOk) {
      return res.status(401).json({ error: "Invalid password" });
    }

    jwt.sign(
      {
        username: userData.username,
        id: userData._id,
      },
      jwtSecret,
      {},
      (err, token) => {
        if (err) throw err;
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        }).json({
          id: userData._id,
          username: userData.username,
          email: userData.email
        });
      }
    );
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Profile endpoint
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    const userData = await User.findById(req.user.id).select('-password');
    if (!userData) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(userData);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Logout endpoint
app.post("/api/logout", (req, res) => {
  res.cookie("token", "", {
    httpOnly: true,
    expires: new Date(0),
    sameSite: "lax"
  }).json({ message: "Logged out successfully" });
});

// Protected routes middleware
app.use("/api/personal", authenticateToken);
app.use("/api/objective", authenticateToken);
app.use("/api/experience", authenticateToken);
app.use("/api/education", authenticateToken);
app.use("/api/skills", authenticateToken);
app.use("/api/projects", authenticateToken);
app.use("/api/certifications", authenticateToken);
app.use("/api/reference", authenticateToken);
app.use("/api/resume", authenticateToken);

// Post details to the database
app.post("/api/objective", async (req, res) => {
  try {
    const { objective } = req.body;
    const postData = await Objective.create({
      objective,
    });
    res.json(postData);
  } catch (e) {
    res.status(500).json("Failed to post details");
  }
});
app.post("/api/experience", async (req, res) => {
  try {
    const { experiences } = req.body;
    const postData = await Experience.create({
      experiences,
    });
    res.json(postData);
  } catch (e) {
    res.status(500).json("Failed to post details");
  }
});
app.post("/api/education", async (req, res) => {
  try {
    const { education } = req.body;
    const postData = await Education.create({
      education,
    });
    res.json(postData);
  } catch (e) {
    res.status(500).json("Failed to post details");
  }
});
app.post("/api/skills", async (req, res) => {
  try {
    const { content } = req.body;
    const postData = await Skills.create({
      content,
    });
    res.json(postData);
  } catch (e) {
    res.status(500).json("Failed to post details");
  }
});
app.post("/api/projects", async (req, res) => {
  try {
    const { project } = req.body;
    const postData = await Projects.create({
      project,
    });
    res.json(postData);
  } catch (e) {
    res.status(500).json("Failed to post details");
  }
});
app.post("/api/certifications", async (req, res) => {
  try {
    const { certificate } = req.body;
    const postData = await Certification.create({
      certificate,
    });
    res.json(postData);
  } catch (e) {
    res.status(500).json("Failed to post details");
  }
});
app.post("/api/reference", async (req, res) => {
  try {
    const { referees } = req.body;
    const postData = await Reference.create({
      referees,
    });
    res.json(postData);
  } catch (e) {
    res.status(500).json("Failed to post details");
  }
});

// Fetch all Details for the resume Download
app.get("/api/resume", async (req, res) => {
  try {
    const personal = await Personal.find();
    const objective = await Objective.find();
    const experience = await Experience.find();
    const education = await Education.find();
    const skills = await Skills.find();
    const projects = await Projects.find();
    const certification = await Certification.find();
    const reference = await Reference.find();

    const resumeData = {
      personal,
      objective,
      experience,
      education,
      skills,
      projects,
      certification,
      reference,
    };
    res.json(resumeData);
  } catch (e) {
    console.error("Failed to fetch resume data", e);
    res.status(500).json({ error: "Failed to fetch resume data" });
  }
});

// Fetch details from the database for edit purposes
app.get("/api/personal", async (req, res) => {
  try {
    const personal = await Personal.find();
    res.json(personal);
  } catch (e) {
    console.error("Failed to fetch personal details", e);
    res.status(500).json({ error: "Failed to fetch personal details" });
  }
});
app.get("/api/objective", async (req, res) => {
  try {
    const objective = await Objective.find();
    res.json(objective);
  } catch (e) {
    console.error("Failed to fetch Objective", e);
    res.status(500).json({ error: "Failed to fetch Objective" });
  }
});
app.get("/api/experience", async (req, res) => {
  try {
    const experience = await Experience.find();
    res.json(experience);
  } catch (e) {
    console.error("Failed to fetch Experience details", e);
    res.status(500).json({ error: "Failed to fetch Experience details" });
  }
});
app.get("/api/education", async (req, res) => {
  try {
    const education = await Education.find();
    res.json(education);
  } catch (e) {
    console.error("Failed to fetch Education Details", e);
    res.status(500).json({ error: "Failed to fetch Education Details" });
  }
});
app.get("/api/skills", async (req, res) => {
  try {
    const skills = await Skills.find();
    res.json(skills);
  } catch (e) {
    console.error("Failed to fetch Skills Details", e);
    res.status(500).json({ error: "Failed to fetch Skills Details" });
  }
});
app.get("/api/projects", async (req, res) => {
  try {
    const projects = await Projects.find();
    res.json(projects);
  } catch (e) {
    console.error("Failed to fetch Projects Details", e);
    res.status(500).json({ error: "Failed to fetch Projects Details" });
  }
});
app.get("/api/certification", async (req, res) => {
  try {
    const certification = await Certification.find();
    res.json(certification);
  } catch (e) {
    console.error("Failed to fetch Certification Details", e);
    res.status(500).json({ error: "Failed to fetch Certification Details" });
  }
});
app.get("/api/referee", async (req, res) => {
  try {
    const referee = await Reference.find();
    res.json(referee);
  } catch (e) {
    console.error("Failed to fetch Referee Details", e);
    res.status(500).json({ error: "Failed to fetch Referee Details" });
  }
});

// Edit details and update them to Mongo Atlas DB
app.put("/api/personal", async (req, res) => {
  try {
    const { name, email, address, phone, website, linked } = req.body;
    const personal = await Personal.findOneAndUpdate(
      {},
      {
        name,
        email,
        address,
        phone,
        website,
        linked,
      },
      { new: true }
    );
    res.json(personal);
  } catch (e) {
    console.log("Failed to update personal details", e);
    res.status(500).json("Failed to update personal details");
  }
});
app.put("/api/objective", async (req, res) => {
  try {
    const { objective } = req.body;
    const objectiveDetails = await Objective.findOneAndUpdate(
      {},
      { objective },
      { new: true }
    );
    res.json(objectiveDetails);
  } catch (e) {
    console.log("Failed to update objective details", e);
    res.status(500).json("Failed to update objective details");
  }
});
app.put("/api/experience", async (req, res) => {
  try {
    const { experiences } = req.body;
    const experience = await Experience.findOneAndUpdate(
      {},
      { experiences },
      { new: true }
    );
    res.json(experience);
  } catch (e) {
    console.log("Failed to update experience details", e);
    res.status(500).json("Failed to update experience details");
  }
});
app.put("/api/education", async (req, res) => {
  try {
    const { education } = req.body;
    const educations = await Education.findOneAndUpdate(
      {},
      { education },
      { new: true }
    );
    res.json(educations);
  } catch (e) {
    console.log("Failed to update education details", e);
    res.status(500).json("Failed to update education details");
  }
});
app.put("/api/skills", async (req, res) => {
  try {
    const { content } = req.body;
    const skills = await Skills.findOneAndUpdate(
      {},
      { content },
      { new: true }
    );
    res.json(skills);
  } catch (e) {
    console.log("Failed to update skills details", e);
    res.status(500).json("Failed to update skills details");
  }
});
app.put("/api/projects", async (req, res) => {
  try {
    const { project } = req.body;
    const projects = await Projects.findOneAndUpdate(
      {},
      { project },
      { new: true }
    );
    res.json(projects);
  } catch (e) {
    console.log("Failed to update projects details", e);
    res.status(500).json("Failed to update projects details");
  }
});
app.put("/api/certifications", async (req, res) => {
  try {
    const { certificate } = req.body;
    const certification = await Certification.findOneAndUpdate(
      {},
      { certificate },
      { new: true }
    );
    res.json(certification);
  } catch (e) {
    console.log("Failed to update certification details", e);
    res.status(500).json("Failed to update certification details");
  }
});
app.put("/api/reference", async (req, res) => {
  try {
    const { referees } = req.body;
    const reference = await Reference.findOneAndUpdate(
      {},
      { referees },
      { new: true }
    );
    res.json(reference);
  } catch (e) {
    console.log("Failed to update reference details", e);
    res.status(500).json("Failed to update reference details");
  }
});

// Delete Resume Details
app.delete("/api/personal", async (req, res) => {
  try {
    const personal = await Personal.deleteMany({});
    res.json({ message: "Personal Details deleted successfully" });
  } catch (e) {
    console.log("Failed to delete Personal details", e);
    res.status(422).json("Failed to delete Personal details");
  }
});

app.delete("/api/objective", async (req, res) => {
  try {
    const objective = await Objective.deleteMany({});
    res.json({ message: "Objective Details deleted successfully" });
  } catch (e) {
    console.log("Failed to delete Objective details", e);
    res.status(422).json("Failed to delete Objective details");
  }
});
app.delete("/api/experience/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const experience = await Experience.findOneAndUpdate(
      {},
      { $pull: { experiences: { _id: id } } },
      { new: true }
    );
    res.json({ message: "Experience Details deleted successfully" });
  } catch (e) {
    console.log("Failed to delete Experience details", e);
    res.status(422).json("Failed to delete Experience details");
  }
});

app.delete("/api/education/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const education = await Education.findOneAndUpdate(
      {},
      { $pull: { education: { _id: id } } },
      { new: true }
    );
    res.json({ message: "Education Details deleted successfully" });
  } catch (e) {
    console.log("Failed to delete Education details", e);
    res.status(422).json("Failed to delete Education details");
  }
});

app.delete("/api/skills", async (req, res) => {
  try {
    const skills = await Skills.deleteMany({});
    res.json({ message: "Skills Details deleted successfully" });
  } catch (e) {
    console.log("Failed to delete skills details", e);
    res.status(422).json("Failed to delete skills details");
  }
});

app.delete("/api/project/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const projects = await Projects.findOneAndUpdate(
      {},
      { $pull: { project: { _id: id } } },
      { new: true }
    );
    res.json({ message: "Project Details deleted successfully" });
  } catch (e) {
    console.log("Failed to delete project details", e);
    res.status(422).json("Failed to delete project details");
  }
});

app.delete("/api/certification", async (req, res) => {
  try {
    const certification = await Certification.deleteMany({});
    res.json({ message: "Certification Details deleted successfully" });
  } catch (e) {
    console.log("Failed to delete certification details", e);
    res.status(422).json("Failed to delete certification details");
  }
});

app.delete("/api/reference/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const reference = await Reference.findOneAndUpdate(
      {},
      { $pull: { referees: { _id: id } } },
      { new: true }
    );
    res.json({ message: "Referee Details deleted successfully" });
  } catch (e) {
    console.log("Failed to delete Referee details", e);
    res.status(422).json("Failed to delete Referee details");
  }
});

// Post details for AI prompt to generate a resume Sample
app.post("/api/generate-resume", async (req, res) => {
  try {
    const { prompt } = req.body;

    const generatedResume = await openai.createCompletion({
      model: "text-davinci-003",
      prompt,
      max_tokens: 3000,
    });

    const resumeText = generatedResume.data.choices[0].text.trim();

    res.json({ resume: resumeText });
  } catch (error) {
    console.error("Failed to generate resume:", error);
    res.status(500).json({ error: "Failed to generate resume" });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!" });
});

// Start server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
