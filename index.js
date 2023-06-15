const express = require('express');
const cors = require('cors');
const SSLCommerzPayment = require('sslcommerz-lts')
require('dotenv').config();
const app = express();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'unauthorized access'});
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if(err){
      return res.status(401).send({error: true, message: 'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}


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

    const studentCollection = client.db("SummerDb").collection("students");
    const classCollection = client.db("SummerDb").collection("classes");
    const cartCollection = client.db("SummerDb").collection("carts");
    const casteCollection = client.db("SummerDb").collection("caste");
  
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({token})
    })

    const verifyAdmin = async(req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await classCollection.findOne(query);
      if(user?.role !== 'admin') {
        return res.status(403).send({error: true, message: 'forbidden'})
      }
      next();
    }

    const verifyInstructor = async(req, res, next) => {
      const email = req.decoded.email;
      const query = {email: email}
      const user = await classCollection.findOne(query);
      if(user?.role !== 'instructor') {
        return res.status(403).send({error: true, message: 'forbidden'})
      }
      next();
    }

    
    // students related apis
    app.get('/students', async(req, res) => {
      const result = await studentCollection.find().toArray();
      res.send(result)
    });

    app.post('/students', async(req, res) => {
      const student = req.body;
      const query  = {email: student.email}
      console.log(query);
      const existingStudent = await studentCollection.findOne(query);
      if(existingStudent) {
        return res.send({message: 'Student already exists'})
      }
      const result = await studentCollection.insertOne(student);
      res.send(result);
    })

    app.get('/students/admin/:email', verifyJWT, async(req, res) => {
      const email = req.params.email;

      if(req.decoded.email !== email){
        res.send({admin: false})
      }

      const query = {email: email}
      const user = await studentCollection.findOne(query)
      const result = {admin: user?.role === 'admin'}
      res.send(result);
    })

    app.patch('/students/admin/:id', async(req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await studentCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.get('/students/instructor/:email', verifyJWT, async(req, res) => {
      const email = req.params.email;

      if(req.decoded.email !== email){
        res.send({instructor: false})
      }

      const query = {email: email}
      const user = await studentCollection.findOne(query)
      const result = {instructor: user?.role === 'instructor'}
      res.send(result);
    })

    app.patch('/students/instructor/:id', async(req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await studentCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    
    // carts related apis
    app.post('/carts', async(req, res) => {
      const menu = req.body;
      console.log(menu);
      const result = await cartCollection.insertOne(menu);
      res.send(result);
    })

    app.get('/carts', verifyJWT, async(req, res) => {
      const email = req.query.email;
      if(!email){
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(403).send({error: true, message: 'forbidden access'})
      }

       const query = { email : email };
       const result = await cartCollection.find(query).toArray();
       res.send(result);
    });

    app.delete('/carts/:id', async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartCollection.deleteOne(query);
      res.send(result);
    })

    app.post('/create-payment-intent', verifyJWT, async(req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // classes related api
    app.get('/classes', async(req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })

    app.post('/classes', verifyJWT, async(req, res) => {
      const newItem = req.body;
      const result = await classCollection.insertOne(newItem)
      res.send(result);
    })
    
    app.patch('/classes/admin/:id', async(req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    app.delete('/classes/:id', verifyJWT,  async(req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(query);
      res.send(result);
    })

    app.get('/caste', async(req, res) => {
      const result = await casteCollection.find().toArray();
      res.send(result);
    })

    app.post('/caste', verifyJWT, async(req, res) => {
      const newItem = req.body;
      const result = await casteCollection.insertOne(newItem)
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