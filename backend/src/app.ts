import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { isAllowedOrigin } from './config/env';
import authRoutes from './routes/auth.routes';
import clientRoutes from './routes/clients.routes';
import loanRoutes from './routes/loans.routes';
import cobrosRoutes from './routes/cobros.routes';
import reportesRoutes from './routes/reportes.routes';
import rutaRoutes from './routes/rutas.routes';
import settingsRoutes from './routes/settings.routes';

const app: Application = express();

// Railway sits behind a proxy and forwards client IP data via X-Forwarded-* headers.
app.set('trust proxy', 1);

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/cobros', cobrosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/rutas', rutaRoutes);
app.use('/api/settings', settingsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

export default app;
