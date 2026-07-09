import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { registerUser, loginUser } from '../services/auth.service';
import { sendSuccess } from '../utils/response';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z
    .string()
    .trim()
    .email('Email invalido')
    .transform((email) => email.toLowerCase()),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Email invalido')
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1, 'Senha obrigatoria'),
});

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const data = registerSchema.parse(req.body);
    const result = await registerUser(data);
    sendSuccess(res, result, 'Usuario cadastrado com sucesso', 201);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data);
    sendSuccess(res, result, 'Login realizado com sucesso');
  } catch (err) {
    next(err);
  }
}
