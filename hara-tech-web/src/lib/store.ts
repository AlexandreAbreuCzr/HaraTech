import type { Cultura, Programacao, RegaEvento } from './types'

const CULTURAS_KEY = 'hara_culturas'
const PROGRAMACOES_KEY = 'hara_programacoes'
const HISTORICO_KEY = 'hara_historico'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function save<T>(key: string, data: T) {
  localStorage.setItem(key, JSON.stringify(data))
}

export const culturasStore = {
  list: (): Cultura[] => load<Cultura[]>(CULTURAS_KEY, [
    { id: '1', nome: 'Tomate', descricao: 'Tomate cereja e italiano', aguaPorRegaMl: 500, intervaloRegaHoras: 48, umidadeIdealMin: 60, umidadeIdealMax: 80, icone: '🍅', cor: '#ef4444' },
    { id: '2', nome: 'Alface', descricao: 'Alface crespa e americana', aguaPorRegaMl: 200, intervaloRegaHoras: 24, umidadeIdealMin: 70, umidadeIdealMax: 85, icone: '🥬', cor: '#22c55e' },
    { id: '3', nome: 'Cenoura', descricao: 'Cenoura cultivar', aguaPorRegaMl: 300, intervaloRegaHoras: 36, umidadeIdealMin: 50, umidadeIdealMax: 70, icone: '🥕', cor: '#f97316' },
    { id: '4', nome: 'Pimentão', descricao: 'Pimentão verde e vermelho', aguaPorRegaMl: 400, intervaloRegaHoras: 48, umidadeIdealMin: 55, umidadeIdealMax: 75, icone: '🫑', cor: '#eab308' },
    { id: '5', nome: 'Morango', descricao: 'Morango orgânico', aguaPorRegaMl: 150, intervaloRegaHoras: 12, umidadeIdealMin: 65, umidadeIdealMax: 80, icone: '🍓', cor: '#ec4899' },
  ]),
  add: (c: Cultura) => { const list = culturasStore.list(); list.push(c); save(CULTURAS_KEY, list) },
  update: (c: Cultura) => { const list = culturasStore.list(); const i = list.findIndex(x => x.id === c.id); if (i >= 0) list[i] = c; save(CULTURAS_KEY, list) },
  remove: (id: string) => { const list = culturasStore.list(); save(CULTURAS_KEY, list.filter(x => x.id !== id)) },
}

export const programacoesStore = {
  list: (): Programacao[] => load<Programacao[]>(PROGRAMACOES_KEY, []),
  add: (p: Programacao) => { const list = programacoesStore.list(); list.push(p); save(PROGRAMACOES_KEY, list) },
  update: (p: Programacao) => { const list = programacoesStore.list(); const i = list.findIndex(x => x.id === p.id); if (i >= 0) list[i] = p; save(PROGRAMACOES_KEY, list) },
  remove: (id: string) => { const list = programacoesStore.list(); save(PROGRAMACOES_KEY, list.filter(x => x.id !== id)) },
}

export const historicoStore = {
  list: (): RegaEvento[] => load<RegaEvento[]>(HISTORICO_KEY, []),
  add: (e: RegaEvento) => { const list = historicoStore.list(); list.unshift(e); save(HISTORICO_KEY, list.slice(0, 200)) },
}
