import express from 'express';
import cors from 'cors';
import routes from "./routes/index";
import { setupSwagger } from './config/swagger/swagger';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { errorMiddleware } from './middleware/errorMiddleware';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import './config/passport';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
}));
app.use(session({
    secret: process.env.SESSION_SECRET!, // 👈 set this in your .env
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: (Number(process.env.COOKIE_EXPIRE) || 1) * 24 * 60 * 60 * 1000, // same as cookie
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
    },
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI!,
        collectionName: "sessions",
    }),
}));


app.use(passport.initialize());
app.use(passport.session());

app.use("/api", routes);
app.use(errorMiddleware);

setupSwagger(app)


export default app;
