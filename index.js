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