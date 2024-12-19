const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()

const port = process.env.PORT || 9000
const app = express()

app.use(cors())
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.gsnwc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})

async function run() {
  try {
    const db = client.db('consjobcollection')
    const consjobCollection = db.collection('jobs')
    const bidCollection = db.collection('bids')

    app.post('/add-job',async(req,res)=>{
      const jobData = req.body
      const result = await consjobCollection.insertOne(jobData)
      
      res.send(result)
    })

    app.get('/jobs',async(req,res)=>{
      const result = await consjobCollection.find().toArray()
      res.send(result)
    })


    app.get('/jobs/:email',async(req,res)=>{
      const email = req.params.email 
      const query = {'buyer.email':email}
      const result = await consjobCollection.find().toArray()
      res.send(result)
    })


    app.delete('/job/:id',async(req,res)=>{
      const id = req.params.id 
      const query ={_id: new ObjectId(id)}
      const result = await consjobCollection.deleteOne(query)
      res.send(result)
      
    })

    // get a single job data by id from db

    app.get('/job/:id',async(req,res)=>{
      const id = req.params.id 
      const query ={_id: new ObjectId(id)}
      const result = await consjobCollection.findOne(query)
      res.send(result)
    })


    app.put('/update-job/:id',async(req,res)=>{
      const id = req.params.id 
     
      const jobData = req.body
      const update ={
        $set: jobData,
      }
      const query ={_id: new ObjectId(id)}
      const options = {upsert: true}
      
      const result = await consjobCollection.updateOne(query,update,options)
      
      res.send(result)
    })



    // save a bid data in db
    app.post('/add-bid',async(req,res)=>{
      const bidData = req.body
    // 0.if a user placed a bid already in the job
    const query ={email: bidData.email, jobId:bidData.jobId}
    const alreadyExist = await bidCollection.findOne(query)
    if(alreadyExist){
      return res
      .status(400)
      .send('you have already placed a bid on this job!')
    }

    // get all bid-request for a specific user
    app.get('/bid-requests/:email',async(req,res)=>{
      const email = req.params.email 
      const query ={buyer:email}
      const result = await bidCollection.find(query).toArray()
      res.send(result)
    })

     // get all bids for a specific user
     app.get('/bids/:email',async(req,res)=>{
      const isBuyer = req.query.buyer
      const email = req.params.email 
      let query = {}
      
      if(isBuyer){
        query.buyer=email
      }
      else{
    query.email = email

      }
      const result = await bidCollection.find(query).toArray()
      res.send(result)
    })




      // 1.save data in bids collection
     
      const result = await bidCollection.insertOne(bidData)
      // 2.increase bid count in jobs collection
      const filter = {_id: new ObjectId(bidData.jobId)}
      const update = {
        $inc:{bid_count:1}
      }
      const updateBidCount = await consjobCollection.updateOne(filter,update)
      
      res.send(result)
    })


    app.patch('/bid-status-update/:id',async(req,res)=>{
      const id = req.params.id 
      const status = req.body
      const filter = {_id: new ObjectId(id)}
      const updated = {
        $set: {status},
      }
      const result = await bidCollection.updateOne(filter,updated)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir)
app.get('/', (req, res) => {
  res.send('Hello from SoloSphere Server....')
})

app.listen(port, () => console.log(`Server running on port ${port}`))
