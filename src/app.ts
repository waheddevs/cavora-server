import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import session from 'express-session';
import MongoDBStore from 'connect-mongodb-session';
import router from './router';
import routerAdmin from './router-admin';
import { MORGAN_FORMAT } from './libs/config';

const app = express();

const MongoStore = MongoDBStore(session);
const store = new MongoStore({
  uri: process.env.MONGO_URL ?? '',
  collection: 'sessions',
});
store.on('error', (err: Error) => console.log('SESSION STORE ERROR: ', err));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(MORGAN_FORMAT));

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? '',
    resave: false,
    saveUninitialized: false,
    store,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
  }),
);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use((req, res, next) => {
  res.locals.member = req.session.member ?? null;
  next();
});

app.use('/admin', routerAdmin);
app.use('/', router);

export default app;
