import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/auth.routes';
import deviceRoutes from './routes/device.routes';

const app = express();

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json({ limit: '10kb' }));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: 'Muitas requisicoes, tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

function healthCheck(_req: express.Request, res: express.Response) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
}

app.get('/health', healthCheck);
app.get('/api/v1/health', healthCheck);
app.get('/api/health', healthCheck);

// /api/v1 is the main versioned API prefix.
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);

// Legacy aliases keep older firmware and manual tests working during migration.
app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);

app.use('/auth', authRoutes);
app.use('/devices', deviceRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Rota nao encontrada' });
});

app.use(errorHandler);

export default app;
