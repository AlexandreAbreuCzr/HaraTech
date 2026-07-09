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

// Security headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT', message: 'Muitas requisicoes, tente novamente mais tarde.' },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

function healthCheck(_req: express.Request, res: express.Response) {
  res.json({
    success: true,
    data: { status: 'ok', timestamp: new Date().toISOString() },
  });
}

app.get('/health', healthCheck);
app.get('/api/v1/health', healthCheck);
app.get('/api/health', healthCheck);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/devices', deviceRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/devices', deviceRoutes);

app.use('/auth', authRoutes);
app.use('/devices', deviceRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Rota nao encontrada' },
  });
});

app.use(errorHandler);

export default app;
