require('dotenv').config()
const express = require('express')
const cors = require('cors')

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const app = express()
const port = process.env.PORT || 3000

// MIddle ware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.SECRET_KEY}@cluster0.a3jeczi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    
    const marathonCollection = client.db('marathonDB').collection('marathons')
    const registerCollection = client.db('registerDB').collection('registerInfo')
    const userCollection = client.db('registerDB').collection('userInfo')
    const reviewCollection = client.db('registerDB').collection('reviews')

// register form er data paoar jonno
app.get('/marathonRegister/:id',async(req,res)=>{
      const id = req.params.id
      console.log(id)
      const query = {_id: new ObjectId(id)}
      const result = await marathonCollection.findOne(query) 
      res.send(result)
    })
 
    // search er kaj + reg apply jonno get
    app.get('/marathonRegister',async (req, res) => {
      const email = req.query.email;
      const search = req.query.search;
      let query = { email: email }; // Default filter by email
      if (search) {
        query = {
          ...query,
          $or: [
            { marathonTitle: { $regex: search, $options: 'i' } },
          ],
        };
      }
      try {
        const result = await registerCollection.find(query).toArray();
        res.send(result);
      } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).send({ message: 'Error fetching data' });
      }
    });

    // 📌 total register koyta tar jonno post kore total jonno update kora hoise
app.post('/registerMarathon/:marathonId', async (req, res) => {
  const marathonId =req.params.marathonId;

    // 1. Save to registerCollection
    await registerCollection.insertOne(req.body);
    // 2. Increment the totalRegistration count
    const result = await marathonCollection.updateOne(
      { _id: new ObjectId(marathonId) },
      { $inc: { totalRegistration: 1 } }
    );
    res.send(result,{ message: 'Registration successful' });
});

app.delete('/deleteRegister/:id',async(req,res)=>{
  const id = req.params.id 
  const filter = {_id: new ObjectId(id)}
  const deleted = await registerCollection.deleteOne(filter)
  res.send(deleted)
})

app.put('/updateApplyList/:id',async(req,res)=>{
  const id = req.params.id 
  const filter = {_id: new ObjectId(id)}
  const options = {upsert: true}
  const updateApply = req.body
  const updateDoc = {
    $set: updateApply,
  }
  const update = await registerCollection.updateOne(filter,updateDoc,options)
  res.send({modifiedCount: update.modifiedCount})
})

    // ===============================================================

    app.get('/marathons',async(req,res)=>{
      const sortParams = req.query.sort === '-createdAt'?{createdAt: -1}: {}
      const limit = parseInt(req.query.limit) || 0;
      // let sortOption = {};
      // if(sortParams === 'date-desc') sortOption = {createdAt: -1};

      const result = await marathonCollection.find().sort(sortParams).limit(limit).toArray()
      res.send(result)
    })

    app.get('/marathon/:id',async(req,res)=>{
      const id = req.params.id
      const query = {_id: new ObjectId(id)}
      const result = await marathonCollection.findOne(query)
      res.send(result)
    })

    // server/post route
    app.post("/marathons", async (req, res) => {
    const data = req.body;
    // console.log(data)
    const result = await marathonCollection.insertOne(data);
    res.send(result);
});

app.delete('/deleteMarathon/:id',async(req,res)=>{
  const id = req.params.id 
  const filter = {_id: new ObjectId(id)}
  const deleted = await marathonCollection.deleteOne(filter)
  res.send(deleted)
})

app.put('/updateMarathonList/:id',async(req,res)=>{
  const id = req.params.id 
  // console.log(id)
  const newMarathonEvent = req.body
  console.log(newMarathonEvent)
  const query = {_id: new ObjectId(id)}
  const marathonEvent = await marathonCollection.findOne(query)
  const updateDoc = {
    $set: newMarathonEvent }
    const result = await marathonCollection.updateOne(query,updateDoc)
    res.send(result)
})

// =========

// 🧠 Create or update user profile
app.post("/users", async (req, res) => {
  try {
    const { name, email, photo } = req.body;

    // if missing info
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // check if user exists
    const existingUser = await userCollection.findOne({ email });

    if (existingUser) {
      // update user info
      const updated = await userCollection.updateOne(
        { email },
        { $set: 
          { name, photo, updatedAt: new Date() } }
      );
      return res.status(200).json({ message: "Profile updated", updated });
    }

    // new user
    const result = await userCollection.insertOne({
      name,
      email,
      photo,
      role: "user",
      createdAt: new Date(),
    });

    res.status(201).json({ message: "Profile created", result });
  } catch (error) {
    console.error("Error saving profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// 🧩 Get single user profile by email
app.get("/users/:email", async (req, res) => {
  try {
   
    const email = req.params.email;

    const user = await userCollection.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// ===========================================================profile

// Get User Profile
// 🔹 Get user profile by email
app.get("/profile/:email", async (req, res) => {
  try {
    const email = req.params.email;

    // Find user
    const user = await userCollection.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get user statistics
    const marathonsJoined = await registerCollection.countDocuments({ email });
    const marathonsCreated = await marathonCollection.countDocuments({  email });
    
    // Calculate total distance
    const registrations = await registerCollection.find({ email }).toArray();

    console.log(registrations);


    let totalDistance = 0;
    registrations.forEach(reg => {
      if (reg.runningDistance) {
        const distance = parseInt(reg.runningDistance.replace('k', ''));
        totalDistance += distance;
      }
    });

    // Return profile with statistics
    res.status(200).json({
      ...user,
      statistics: {
        marathonsJoined,
        marathonsCreated,
        totalDistance
      }
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});
// 🔹 Update user profile
app.put("/profile/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const { name, phone, location, bio, preferredDistance, photoURL } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: "Name is required" });
    }

    // Check if user exists
    const existingUser = await userCollection.findOne({ email });
    
    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update profile data
    const updateData = {
      name: name.trim(),
      phone: phone?.trim() || '',
      location: location?.trim() || '',
      bio: bio?.trim() || '',
      preferredDistance: preferredDistance || '10k',
      updatedAt: new Date()
    };

    // Only update photoURL if provided
    if (photoURL) {
      updateData.photo = photoURL;
    }

    // Update in database
    const result = await userCollection.updateOne(
      { email },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    console.log(result);

    if (!result.modifiedCount) {
      return res.status(404).json({ message: "Failed to update profile" });
    }

    res.status(200).json({
      message: "Profile updated successfully",
      profile: result.value
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// 🔹 Get user achievements
app.get("/profile/:email/achievements", async (req, res) => {
  try {
    const email = req.params.email;

    const achievements = [];
    
    // Count activities
    const marathonsJoined = await registerCollection.countDocuments({ email });
    const marathonsCreated = await marathonCollection.countDocuments({ email });
    
    // First Marathon Achievement
    if (marathonsJoined >= 1) {
      achievements.push({
        id: 1,
        title: 'First Step',
        description: 'Registered for your first marathon',
        icon: '🏃',
        earnedAt: new Date()
      });
    }
    
    // Marathon Creator Achievement
    if (marathonsCreated >= 1) {
      achievements.push({
        id: 2,
        title: 'Event Organizer',
        description: 'Created your first marathon event',
        icon: '🎯',
        earnedAt: new Date()
      });
    }
    
    // Marathon Enthusiast Achievement
    if (marathonsJoined >= 5) {
      achievements.push({
        id: 3,
        title: 'Marathon Enthusiast',
        description: 'Joined 5 marathon events',
        icon: '🏅',
        earnedAt: new Date()
      });
    }
    
    // Marathon Master Achievement
    if (marathonsJoined >= 10) {
      achievements.push({
        id: 4,
        title: 'Marathon Master',
        description: 'Joined 10 marathon events',
        icon: '🌟',
        earnedAt: new Date()
      });
    }
    
    // Super Organizer Achievement
    if (marathonsCreated >= 3) {
      achievements.push({
        id: 5,
        title: 'Super Organizer',
        description: 'Created 3 marathon events',
        icon: '⭐',
        earnedAt: new Date()
      });
    }
    
    res.status(200).json(achievements);
  } catch (error) {
    console.error("Error fetching achievements:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// 🔹 Get profile statistics
app.get("/profile/:email/statistics", async (req, res) => {
  try {
    const email = req.params.email;
    
    // Get marathons joined
    const marathonsJoined = await registerCollection.countDocuments({ email });
    
    // Get marathons created
    const marathonsCreated = await marathonCollection.countDocuments({ email });
    
    // Calculate total distance
    const registrations = await registerCollection.find({ email }).toArray();
    let totalDistance = 0;
    registrations.forEach(reg => {
      if (reg.runningDistance) {
        const distance = parseInt(reg.runningDistance.replace('k', ''));
        totalDistance += distance;
      }
    });

    // Get recent activities
    const recentMarathons = await marathonCollection
      .find({ creatorEmail: email })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    const recentRegistrations = await registerCollection
      .find({ email })
      .sort({ registeredAt: -1 })
      .limit(3)
      .toArray();
    
    res.status(200).json({
      marathonsJoined,
      marathonsCreated,
      totalDistance,
      recentMarathons: recentMarathons.length,
      recentRegistrations: recentRegistrations.length
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++dashboard er

// ====================== 🏁 DASHBOARD ROUTES ======================

// 📊 Dashboard Statistics API
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const totalMarathons = await marathonCollection.countDocuments();
    const myMarathons = await marathonCollection.countDocuments({ email });
    const myRegistrations = await registerCollection.countDocuments({ email });

    const now = new Date();
    const upcomingEvents = await marathonCollection.countDocuments({
      marathonStartDate: { $gte: now },
    });

    res.json({ totalMarathons, myMarathons, myRegistrations, upcomingEvents });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// 🕒 Dashboard Recent Activity API
app.get("/api/dashboard/recent-activity", async (req, res) => {
  try {
    const email = req.query.email;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const recentCreations = await marathonCollection
      .find({ email })
      .sort({ createdAt: -1 })
      .limit(3)
      .toArray();

    const recentRegistrations = await registerCollection
      .find({ email })
      .sort({ registeredAt: -1 })
      .limit(3)
      .toArray();

    const activityFeed = [];

    recentCreations.forEach((marathon) => {
      activityFeed.push({
        type: "creation",
        title: "Created a new marathon",
        description: marathon.title || "Unnamed Marathon",
        time: marathon.createdAt
          ? new Date(marathon.createdAt).toLocaleString()
          : "Recently",
      });
    });

    recentRegistrations.forEach((reg) => {
      activityFeed.push({
        type: "registration",
        title: "Registered for a marathon",
        description: reg.marathonTitle || "Unnamed Marathon",
        time: reg.registeredAt
          ? new Date(reg.registeredAt).toLocaleString()
          : "Recently",
      });
    });

    res.json(activityFeed.sort((a, b) => new Date(b.time) - new Date(a.time)));
  } catch (error) {
    console.error("Error fetching recent activity:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++   review
// ====================== ⭐ REVIEW & RATING SYSTEM ======================



// 📌 POST: Add a new review
app.post('/reviews', async (req, res) => {
  try {
    const { marathonId, userName, email, rating, comment } = req.body;

    if (!marathonId || !rating || !userName) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const review = {
      marathonId,
      userName,
      email,
      rating: Number(rating),
      comment: comment || "",
      createdAt: new Date(),
    };

    const result = await reviewCollection.insertOne(review);
    res.status(201).json({ message: "Review added successfully", result });
  } catch (error) {
    console.error("Error adding review:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 📌 GET: All reviews for a marathon
app.get('/reviews/:marathonId', async (req, res) => {
  try {
    const marathonId = req.params.marathonId;
    const reviews = await reviewCollection
      .find({ marathonId })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 📊 GET: Rating summary for a marathon
app.get('/reviews/summary/:marathonId', async (req, res) => {
  try {
    const marathonId = req.params.marathonId;

    const pipeline = [
      { $match: { marathonId } },
      {
        $group: {
          _id: "$marathonId",
          avgRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
          ratings: { $push: "$rating" },
        },
      },
    ];

    const result = await reviewCollection.aggregate(pipeline).toArray();

    if (result.length === 0)
      return res.json({ avgRating: 0, totalReviews: 0, distribution: {} });

    const { avgRating, totalReviews, ratings } = result[0];
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratings.forEach((r) => (distribution[r] = (distribution[r] || 0) + 1));

    res.json({
      avgRating: Number(avgRating.toFixed(2)),
      totalReviews,
      distribution,
    });
  } catch (error) {
    console.error("Error summarizing ratings:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// 🗑️ DELETE: Remove a review (optional)
app.delete('/reviews/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const result = await reviewCollection.deleteOne(filter);
    res.json({ message: "Review deleted", result });
  } catch (error) {
    console.error("Error deleting review:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});





    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('hello marathon')
})
app.listen(port, () => {
    console.log(`server ok, ${ port }`)
})