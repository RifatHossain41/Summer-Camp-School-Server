const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.vb42ct1.mongodb.net/?retryWrites=true&w=majority`;

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
    await client.connect();

    const studentsCollection = client.db("SummerDb").collection("students");
    // const classesCollection = client.db("bistroDb").collection("classes");

    app.get('/students', async(req, res) => {
      const result = await studentsCollection.find().toArray();
      res.send(result)
    });

    app.post('/students', async(req, res) => {
      const student = req.body;
      console.log(student);
      const query  = {email: student.email}
      const existingStudent = await studentsCollection.findOne(query);
      if(existingStudent) {
        return res.send({message: 'Student already exists'})
      }
      const result = await studentsCollection.insertOne(student);
      res.send(result);
    })
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get("/", (req, res) => {
  res.send('summer camp is running')
})

app.listen(port, () => {
  console.log(`Summer Camp is sitting in port ${port}`)
})