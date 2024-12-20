const express = require('express')
const cors = require('cors')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
require('dotenv').config()
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const port = process.env.PORT || 9000
const app = express()
const corsOptions = {
  origin: ['http://localhost:5173'],
  credentials: true,
  optionalSuccessStatus: 200,
}
app.use(cors(corsOptions))
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
const varifyToken =(req,res,next) =>{
  const token = req.cookies?.token
  if(!token) return res.status(401).send({message: ' unauthorized access'})
    jwt.verify(token,process.env.SECRET_KEY,(err,decoded)=>{

 
  if(err){
    return res.status(401).send({message:'unauthorize access'})
  }
  req.user= decoded
})
  
  next()
}

async function run() {
  try {
    const db = client.db('consjobcollection')
    const consjobCollection = db.collection('jobs')
    const bidCollection = db.collection('bids')


    // generate jwt
    app.post('/jwt',async(req,res)=>{
      const email = req.body
      // create token
      const token=jwt.sign(email,process.env.SECRET_KEY,{expiresIn:'6h'})
      res.cookie('token',token,{
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production'?'none':'strict',
      }).send({success: true})
    })

    // logout || clear cookie from browser
    app.get('/logout',async(req,res)=>{
      res.clearCookie('token',{
        maxAge: 0,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production'?'none':'strict',
      }).send({success: true})
    })
    
    
  // app
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




    app.get('/bids/:email', async (req, res) => {
      const isBuyer = req.query.buyer;
      const email = req.params.email;
      
      let query = isBuyer ? { buyer: email } : { email: email };
      
      const result = await bidCollection.find(query).toArray();
      res.send(result);
  });
  

     // get all bids for a specific user
    //  app.get('/bids/:email',async(req,res)=>{
    //   // const decodeEmail = req.user?.email
    //   const isBuyer = req.query.buyer
    //   const email = req.params.email 
    //   // if(decodeEmail !== email ) return res.status(401).send({message: ' unauthorized access'})
    //   let query = {}
      
    //   if(isBuyer){
    //     query.buyer=email
    //   }
    //   else{
    // query.email = email

    //   }
    //   const result = await bidCollection.find(query).toArray()
    //   res.send(result)
    // })




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
      const {status} = req.body
      console.log(status)
      const filter = {_id: new ObjectId(id)}
      const updated = {
        $set: {status},
      }
      const result = await bidCollection.updateOne(filter,updated)
      res.send(result)
    })

    // get all jobs

    app.get('/all-jobs',async(req,res)=>{
      const filter = req.query.filter
      const search = req.query.search
      const sort = req.query.sort
      let options = {}
      if(sort) options = {sort:{deadline: sort === 'asc'?1:-1}}
      
      // category: filter
      let query = {title:{
        $regex: search,$options: 'i',
      }}
      if(filter) query.category = filter
      const result = await consjobCollection.find(query,options).toArray()
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
