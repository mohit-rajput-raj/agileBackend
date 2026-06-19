import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
// const app = express();
import {app,io,server} from "./library/socket.js";
import fileUpload from "express-fileupload";
import path from 'path'
const __dirname  = path.resolve();

app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: "/tmp/",
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
import authRoute from "./routes/auth.rout.js";
import dashRoute from "./routes/dashBoard.route.js";
import messageRoute from "./routes/message.route.js";
import adminRoute from "./routes/admin.route.js";
import homeRoute from "./routes/home.rout.js";
import userRoute from "./routes/user.route.js";
import connectionsRoute from "./routes/connections.route.js";
import notificationRoute from "./routes/notification.route.js";
import postsRoute from "./routes/posts.route.js";
// import profile from "./routes/profile.rout.js";
dotenv.config();
const Port = process.env.PORT || 3000;
import {connectDB} from "./library/db.js";
connectDB();    

// if(process.env.NODE_ENV ==='production'){
app.use(cors({origin: process.env.FRONT_URL,credentials: true,}));
// }
// else{
//     app.use(cors({origin: process.env.FRONT_URL_LOCAL,credentials: true,}));
// }
app.use(cookieParser());
app.use(express.json());
// app.get('/',(req,res)=>{res.send('Hello World bhai saab');})

// app.use("/","hello my agile friends");
app.use("/api/auth", authRoute);
app.use("/api/dashboard", dashRoute);
app.use("/api/messages", messageRoute);
app.use("/api/home", homeRoute);
app.use("/api/user",userRoute );
app.use("/api/connections", connectionsRoute);
app.use("/api/notifications", notificationRoute);
app.use("/api/admin", adminRoute);
app.use("/api/posts", postsRoute);
// console.log(__dirname);

// if(process.env.NODE_ENV==='production'){
//     app.use(express.static(path.join(__dirname,"../front/dist")));
//     app.get("*", (req,res)=>{
//         res.sendFile(path.resolve(__dirname,"../front","dist", "index.html"));
//     })
//     // console.log('done yo');
    
// }


server.listen(Port, () => {
    console.log(`Server is running on port ${Port}`);
});

