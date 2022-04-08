const urlmodel = require("../models/urlmodel")
const validUrl = require('valid-url')
const shortid = require('shortid')


const baseUrl = 'http://localhost:3000'
const redis = require("redis");

const { promisify } = require("util");

//Connect to redis
const redisClient = redis.createClient(
    16368,
    "redis-16368.c15.us-east-1-2.ec2.cloud.redislabs.com",
    { no_ready_check: true }
);
redisClient.auth("Y52LH5DG1XbiVCkNC2G65MvOFswvQCRQ", function (err) {
    if (err) throw err;
});

redisClient.on("connect", async function () {
    console.log("Connected to Redis..");
});



//1. connect to the server
//2. use the commands :

//Connection setup for redis



const SET_ASYNC = promisify(redisClient.SET).bind(redisClient);
const GET_ASYNC = promisify(redisClient.GET).bind(redisClient);


const isValid = function(value){
    if(typeof value ==undefined ||  value ==null)return false
    if(typeof value==='string'&&value.trim().length===0) return false
    return true
}

const createUrl = async function (req, res) {

    try {
        if (!validUrl.isUri(baseUrl)) {
            return res.status(401).send('Invalid base URL')
        }
        let longUrl = req.body.longUrl
        if(Object.keys(req.body)==0){ return res.status(400).send({status:false,msg:"data missing"})}

        const req0 = isValid(longUrl)
        if(!req0) return res.status(400).send({status:false,msg:"long url is required"})

        if (validUrl.isUri(longUrl)) {
            let cahcedProfileData = await GET_ASYNC(`${req.body.longUrl}`)
            if (cahcedProfileData) {
                res.status(200).send(cahcedProfileData)
            } else {
                let finddoc = await urlmodel.findOne({ longUrl: longUrl })
                if (finddoc) {
                    let stored = finddoc
                    let finalData = { longUrl: stored.longUrl, shortUrl: stored.shortUrl, urlCode: stored.urlCode }
                    await SET_ASYNC(`${finalData.longUrl}`, JSON.stringify(finalData),"EX",30)
                    await SET_ASYNC(`${finalData.urlCode}`, finalData.longUrl,"EX",30)
                    res.status(200).send({ status: true, data: finalData })
                } else {
                    let urlCode = shortid.generate()
                    let findurlcode = await urlmodel.findOne({ urlCode: urlCode })
                    if (findurlcode) return res.status(409).send({ msg: "url code already exist generate again" })

                    const shortUrl = baseUrl + '/' + urlCode

                    url = await urlmodel.create({ longUrl, shortUrl, urlCode })

                    let details = await urlmodel.findOne(url)
                    let stored = details
                    let finalData = { longUrl: stored.longUrl, shortUrl: stored.shortUrl, urlCode: stored.urlCode }
                    await SET_ASYNC(`${finalData.longUrl}`, JSON.stringify(finalData),"EX",30)
                    await SET_ASYNC(`${finalData.urlCode}`, finalData.longUrl,"EX",30)
                    res.status(201).send({ status: true, data: finalData })
                }
            }

        } else {
            return res.status(404).send({ status: false, data: "Invalid url" })
        }

    } catch (error) {
        res.status(500).send(error.message)
    }
}


const getUrl = async function (req, res) {
    try {

        let urlCode = req.params.urlCode;

        if (!shortid.isValid(urlCode)) {
            return res.status(400).send({status:false,msg:'short id format is invalid'});
          }


        let cahcedProfileData = await GET_ASYNC(`${urlCode}`)
        if (cahcedProfileData) {
            return res.redirect(301, cahcedProfileData)
        } else {

            let findUrlCode = await urlmodel.findOne({ urlCode: urlCode })
            if (!findUrlCode) return res.status(404).send({ status: false, message: "URL Code doesn't exists" })

            await SET_ASYNC(`${finalData.longUrl}`, JSON.stringify(finalData),"EX",30)
            await SET_ASYNC(`${finalData.urlCode}`, finalData.longUrl,"EX",30)

            let url = findUrlCode.longUrl;
            return res.status(302).redirect(url)
        }
    }
    catch (error) {
        res.status(500).send({ status: false, data: error.message })
    }
}




module.exports.createUrl = createUrl
module.exports.getUrl = getUrl