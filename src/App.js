import React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

// ─────────────────────────────────────────────
// BRAND TOKENS — Ponto Alpha Café
// ─────────────────────────────────────────────
const BRAND = {
  cafeEscuro: '#2c1810',
  marromQuente: '#4a3020',
  caramelo: '#8b6f4e',
  douradoCafe: '#c4a478',
  creme: '#f5ebe0',
  offWhite: '#faf6f1',
  latte: '#d4a574',
  verdeFolha: '#6b8e5a',
  verdeClaro: '#a3c293',
  vermelho: '#c0392b',
  amarelo: '#e6a817',
  azul: '#2c5282',
};

const STATUS_COLORS = {
  concluido: BRAND.verdeFolha,
  em_andamento: BRAND.douradoCafe,
  pendente: BRAND.amarelo,
  nao_iniciado: '#9e9e9e',
  atrasado: BRAND.vermelho,
  bloqueado: '#7b1fa2',
};

const STATUS_LABELS = {
  concluido: 'Concluído',
  em_andamento: 'Em Andamento',
  pendente: 'Pendente',
  nao_iniciado: 'Não Iniciado',
  atrasado: 'Atrasado',
  bloqueado: 'Bloqueado',
};

// ─────────────────────────────────────────────
// DEMO DATA — Tasks template from spreadsheet
// ─────────────────────────────────────────────
const TASK_TEMPLATE = [
  {
    priority: 1,
    task: 'Buscar e selecionar ponto comercial',
    weight: 2,
    startDay: 0,
    duration: 5,
    category: 'Planejamento',
  },
  {
    priority: 2,
    task: 'Projeto da Loja/layout',
    weight: 2,
    startDay: 7,
    duration: 5,
    category: 'Projeto',
  },
  {
    priority: 2,
    task: 'Visita técnica (medidas e elétrica)',
    weight: 2,
    startDay: 9,
    duration: 3,
    category: 'Projeto',
  },
  {
    priority: 2,
    task: 'Assinatura do contrato com franqueado',
    weight: 2,
    startDay: 11,
    duration: 2,
    category: 'Contratual',
  },
  {
    priority: 2,
    task: 'Assinar Contrato de franquia específico',
    weight: 2,
    startDay: 13,
    duration: 2,
    category: 'Contratual',
  },
  {
    priority: 3,
    task: 'Abertura da Empresa e CNPJ',
    weight: 2,
    startDay: 20,
    duration: 10,
    category: 'Jurídico',
  },
  {
    priority: 3,
    task: 'Cotação Quiosque/Loja',
    weight: 2,
    startDay: 22,
    duration: 5,
    category: 'Aquisição',
  },
  {
    priority: 3,
    task: 'Projeto arquitetônico',
    weight: 2,
    startDay: 24,
    duration: 7,
    category: 'Projeto',
  },
  {
    priority: 3,
    task: 'Projeto elétrico',
    weight: 2,
    startDay: 26,
    duration: 5,
    category: 'Projeto',
  },
  {
    priority: 4,
    task: 'Contratar comunicação visual',
    weight: 2,
    startDay: 33,
    duration: 5,
    category: 'Marketing',
  },
  {
    priority: 4,
    task: 'Conta Bancária',
    weight: 2,
    startDay: 35,
    duration: 3,
    category: 'Financeiro',
  },
  {
    priority: 4,
    task: 'Aquisição Máquinas de Cartão',
    weight: 2,
    startDay: 37,
    duration: 3,
    category: 'Equipamentos',
  },
  {
    priority: 4,
    task: 'Documentação ANVISA, prefeitura, CCM',
    weight: 2,
    startDay: 39,
    duration: 10,
    category: 'Jurídico',
  },
  {
    priority: 4,
    task: 'Comprar uniformes equipe',
    weight: 2,
    startDay: 41,
    duration: 5,
    category: 'Aquisição',
  },
  {
    priority: 4,
    task: 'Executar reforma civil / montagem quiosque',
    weight: 2,
    startDay: 43,
    duration: 15,
    category: 'Obra',
  },
  {
    priority: 4,
    task: 'Aquisição móveis e equipamentos',
    weight: 2,
    startDay: 45,
    duration: 10,
    category: 'Aquisição',
  },
  {
    priority: 4,
    task: 'Comprar Logo e luminosos',
    weight: 2,
    startDay: 47,
    duration: 7,
    category: 'Marketing',
  },
  {
    priority: 4,
    task: 'Instalação bombona de água',
    weight: 2,
    startDay: 49,
    duration: 2,
    category: 'Infraestrutura',
  },
  {
    priority: 4,
    task: 'Aprovação dos projetos',
    weight: 2,
    startDay: 51,
    duration: 5,
    category: 'Jurídico',
  },
  {
    priority: 4,
    task: 'Aprovação APT / Autorização instalação',
    weight: 2,
    startDay: 53,
    duration: 7,
    category: 'Jurídico',
  },
  {
    priority: 4,
    task: 'Equipamentos sob medida',
    weight: 2,
    startDay: 55,
    duration: 10,
    category: 'Equipamentos',
  },
  {
    priority: 4,
    task: 'Instalação elétrica',
    weight: 2,
    startDay: 57,
    duration: 5,
    category: 'Infraestrutura',
  },
  {
    priority: 4,
    task: 'Montagem Loja/Quiosque',
    weight: 2,
    startDay: 59,
    duration: 10,
    category: 'Obra',
  },
  {
    priority: 4,
    task: 'Solicitar equipamentos comodato CD',
    weight: 2,
    startDay: 61,
    duration: 3,
    category: 'Equipamentos',
  },
  {
    priority: 4,
    task: 'Relação de utensílios para compra',
    weight: 2,
    startDay: 63,
    duration: 2,
    category: 'Aquisição',
  },
  {
    priority: 5,
    task: 'Solicitar ligação de energia elétrica',
    weight: 2,
    startDay: 70,
    duration: 7,
    category: 'Infraestrutura',
  },
  {
    priority: 5,
    task: 'Instalação da internet',
    weight: 2,
    startDay: 72,
    duration: 3,
    category: 'Infraestrutura',
  },
  {
    priority: 5,
    task: 'Instalar Câmeras',
    weight: 2,
    startDay: 74,
    duration: 3,
    category: 'Infraestrutura',
  },
  {
    priority: 5,
    task: 'Comprar cofre, extintores, carrinho',
    weight: 2,
    startDay: 76,
    duration: 3,
    category: 'Aquisição',
  },
  {
    priority: 5,
    task: 'Placas obrigatórias e regulamentação',
    weight: 2,
    startDay: 78,
    duration: 2,
    category: 'Jurídico',
  },
  {
    priority: 5,
    task: 'Definir Cardápio e Preços',
    weight: 2,
    startDay: 80,
    duration: 3,
    category: 'Operação',
  },
  {
    priority: 5,
    task: 'Habilitação Bandeiras Máquina de Cartão',
    weight: 2,
    startDay: 82,
    duration: 3,
    category: 'Financeiro',
  },
  {
    priority: 5,
    task: 'Instalação sistema de software e caixa',
    weight: 2,
    startDay: 84,
    duration: 3,
    category: 'TI',
  },
  {
    priority: 5,
    task: 'Solicitar vistoria do imóvel',
    weight: 2,
    startDay: 86,
    duration: 2,
    category: 'Jurídico',
  },
  {
    priority: 5,
    task: 'Cadastro nos fornecedores',
    weight: 2,
    startDay: 88,
    duration: 3,
    category: 'Operação',
  },
  {
    priority: 5,
    task: 'Contratar 1ª equipe (3 treinando)',
    weight: 2,
    startDay: 90,
    duration: 7,
    category: 'RH',
  },
  {
    priority: 5,
    task: 'Treinamento teórico equipe',
    weight: 2,
    startDay: 92,
    duration: 5,
    category: 'Treinamento',
  },
  {
    priority: 5,
    task: 'Pedido uniformes, botas, crachás',
    weight: 2,
    startDay: 94,
    duration: 5,
    category: 'Aquisição',
  },
  {
    priority: 5,
    task: 'Instalação Comunicação Visual',
    weight: 2,
    startDay: 96,
    duration: 5,
    category: 'Marketing',
  },
  {
    priority: 5,
    task: 'Teste geral das instalações',
    weight: 2,
    startDay: 98,
    duration: 2,
    category: 'Qualidade',
  },
  {
    priority: 5,
    task: 'Testes dos equipamentos',
    weight: 2,
    startDay: 100,
    duration: 2,
    category: 'Qualidade',
  },
  {
    priority: 5,
    task: 'Recrutar e Selecionar 1ª equipe',
    weight: 2,
    startDay: 102,
    duration: 5,
    category: 'RH',
  },
  {
    priority: 5,
    task: 'Treinamento prático equipe',
    weight: 2,
    startDay: 104,
    duration: 5,
    category: 'Treinamento',
  },
  {
    priority: 5,
    task: 'Comprar banquetas',
    weight: 2,
    startDay: 106,
    duration: 3,
    category: 'Aquisição',
  },
  {
    priority: 5,
    task: 'Enviar projeto para solicitar utensílios',
    weight: 2,
    startDay: 108,
    duration: 2,
    category: 'Operação',
  },
  {
    priority: 5,
    task: 'Definir horário e escala da equipe',
    weight: 2,
    startDay: 110,
    duration: 2,
    category: 'Operação',
  },
  {
    priority: 5,
    task: 'Instalação e entrega de equipamentos',
    weight: 2,
    startDay: 112,
    duration: 3,
    category: 'Equipamentos',
  },
  {
    priority: 6,
    task: '1º pedido CD',
    weight: 2,
    startDay: 119,
    duration: 3,
    category: 'Operação',
  },
  {
    priority: 6,
    task: 'Organização da loja / 1ª produção',
    weight: 2,
    startDay: 121,
    duration: 3,
    category: 'Operação',
  },
  {
    priority: 7,
    task: 'Inauguração Loja',
    weight: 2,
    startDay: 128,
    duration: 2,
    category: 'Marco',
  },
];

function generateDemoData() {
  const today = new Date();
  const obras = [
    {
      id: 'obra-1',
      nome: 'Ponto Alpha — Rodoviária Brasília K1',
      cidade: 'Brasília',
      endereco: 'Rodoviária Plano Piloto, Quiosque K1',
      responsavel: 'Licia',
      dataBase: new Date(today.getTime() - 45 * 86400000),
      prazoFinal: new Date(today.getTime() + 90 * 86400000),
      status: 'em_andamento',
      observacoes: 'Primeira unidade do pool Brasília. Prioridade máxima.',
    },
    {
      id: 'obra-2',
      nome: 'Ponto Alpha — Rodoviária Brasília K2',
      cidade: 'Brasília',
      endereco: 'Rodoviária Plano Piloto, Quiosque K2',
      responsavel: 'Baruque',
      dataBase: new Date(today.getTime() - 30 * 86400000),
      prazoFinal: new Date(today.getTime() + 105 * 86400000),
      status: 'em_andamento',
      observacoes: 'Segunda unidade Brasília. Seguindo cronograma K1.',
    },
    {
      id: 'obra-3',
      nome: 'Ponto Alpha — Teleperformance SP',
      cidade: 'São Paulo',
      endereco: 'Água Branca, São Paulo - SP',
      responsavel: 'Thiago',
      dataBase: new Date(today.getTime() - 90 * 86400000),
      prazoFinal: new Date(today.getTime() + 15 * 86400000),
      status: 'em_andamento',
      observacoes: 'Unidade corporativa dentro da Teleperformance.',
    },
    {
      id: 'obra-4',
      nome: 'Ponto Alpha — Shopping Uberaba',
      cidade: 'Uberaba',
      endereco: 'Shopping Uberaba, Piso L2',
      responsavel: 'Tatiane',
      dataBase: new Date(today.getTime() - 120 * 86400000),
      prazoFinal: new Date(today.getTime() - 5 * 86400000),
      status: 'atrasado',
      observacoes:
        'Atraso na aprovação de projetos pela administração do shopping.',
    },
  ];

  const statusDistributions = {
    'obra-1': { concluido: 12, em_andamento: 5, pendente: 3, nao_iniciado: 30 },
    'obra-2': { concluido: 6, em_andamento: 4, pendente: 5, nao_iniciado: 35 },
    'obra-3': { concluido: 38, em_andamento: 8, pendente: 2, nao_iniciado: 2 },
    'obra-4': { concluido: 30, em_andamento: 3, pendente: 10, nao_iniciado: 7 },
  };

  const obrasTarefas = {};
  obras.forEach((obra) => {
    const dist = statusDistributions[obra.id];
    let idx = 0;
    const tarefas = TASK_TEMPLATE.map((t, i) => {
      let status;
      if (idx < dist.concluido) status = 'concluido';
      else if (idx < dist.concluido + dist.em_andamento)
        status = 'em_andamento';
      else if (idx < dist.concluido + dist.em_andamento + dist.pendente)
        status = 'pendente';
      else status = 'nao_iniciado';
      idx++;

      const startDate = new Date(
        obra.dataBase.getTime() + t.startDay * 86400000
      );
      const endDate = new Date(startDate.getTime() + t.duration * 86400000);
      const progress =
        status === 'concluido'
          ? 100
          : status === 'em_andamento'
          ? Math.floor(Math.random() * 60 + 20)
          : status === 'pendente'
          ? Math.floor(Math.random() * 15)
          : 0;

      const isOverdue = status !== 'concluido' && endDate < today;

      return {
        id: `${obra.id}-task-${i}`,
        ...t,
        status: isOverdue && status !== 'nao_iniciado' ? 'atrasado' : status,
        progress,
        startDate,
        endDate,
        realEndDate:
          status === 'concluido'
            ? new Date(endDate.getTime() + (Math.random() * 6 - 2) * 86400000)
            : null,
        responsavel: [
          'Licia',
          'Baruque',
          'Thiago',
          'Tatiane',
          'Leandro',
          'Marcos',
          'Daiana',
        ][Math.floor(Math.random() * 7)],
        comentarios: [],
      };
    });
    obrasTarefas[obra.id] = tarefas;
  });

  return { obras, obrasTarefas };
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function daysBetween(a, b) {
  return Math.round((b - a) / 86400000);
}

function calcObraMetrics(tarefas) {
  const total = tarefas.length;
  const concluidas = tarefas.filter((t) => t.status === 'concluido').length;
  const emAndamento = tarefas.filter((t) => t.status === 'em_andamento').length;
  const pendentes = tarefas.filter((t) => t.status === 'pendente').length;
  const naoIniciadas = tarefas.filter(
    (t) => t.status === 'nao_iniciado'
  ).length;
  const atrasadas = tarefas.filter((t) => t.status === 'atrasado').length;

  const progressoPonderado = tarefas.reduce(
    (acc, t) => acc + (t.progress * t.weight) / 100,
    0
  );
  const pesoTotal = tarefas.reduce((acc, t) => acc + t.weight, 0);
  const avancoFisico =
    pesoTotal > 0 ? (progressoPonderado / pesoTotal) * 100 : 0;
  const ppc = total > 0 ? (concluidas / total) * 100 : 0;

  const tarefasComPrazo = tarefas.filter(
    (t) => t.status !== 'concluido' && t.status !== 'nao_iniciado'
  );
  const today = new Date();
  const atrasoDias = tarefasComPrazo.reduce((acc, t) => {
    const diff = daysBetween(t.endDate, today);
    return diff > 0 ? acc + diff : acc;
  }, 0);

  return {
    total,
    concluidas,
    emAndamento,
    pendentes,
    naoIniciadas,
    atrasadas,
    avancoFisico,
    ppc,
    atrasoDias,
  };
}

// ─────────────────────────────────────────────
// ICONS (inline SVG components)
// ─────────────────────────────────────────────
const Icon = ({ name, size = 20, color = 'currentColor' }) => {
  const icons = {
    home: (
      <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" />
    ),
    chart: (
      <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    ),
    ai: <path d="M13 10V3L4 14h7v7l9-11h-7z" />,
    whatsapp: (
      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    ),
    plus: <path d="M12 4v16m8-8H4" />,
    calendar: (
      <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    ),
    alert: (
      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    ),
    check: <path d="M5 13l4 4L19 7" />,
    clock: <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />,
    building: (
      <path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    ),
    filter: (
      <path d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    ),
    arrow: <path d="M9 5l7 7-7 7" />,
    back: <path d="M15 19l-7-7 7-7" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="M6 18L18 6M6 6l12 12" />,
    download: (
      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    ),
    user: (
      <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    ),
    file: (
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    ),
    refresh: (
      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    ),
    gantt: (
      <>
        <path d="M4 6h6M4 10h10M4 14h8M4 18h12" />
        <circle cx="10" cy="6" r="1.5" fill={color} />
        <circle cx="14" cy="10" r="1.5" fill={color} />
        <circle cx="12" cy="14" r="1.5" fill={color} />
        <circle cx="16" cy="18" r="1.5" fill={color} />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {icons[name] || icons.home}
    </svg>
  );
};

// ─────────────────────────────────────────────
// STATUS BADGE COMPONENT
// ─────────────────────────────────────────────
const StatusBadge = ({ status, small }) => {
  const color = STATUS_COLORS[status] || '#999';
  const label = STATUS_LABELS[status] || status;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: small ? '2px 8px' : '4px 12px',
        borderRadius: 20,
        fontSize: small ? 11 : 12,
        fontWeight: 600,
        color: '#fff',
        background: color,
        letterSpacing: 0.3,
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: '#fff',
          opacity: 0.7,
        }}
      />
      {label}
    </span>
  );
};

// ─────────────────────────────────────────────
// PROGRESS BAR COMPONENT
// ─────────────────────────────────────────────
const ProgressBar = ({ value, height = 8, color, showLabel = true }) => {
  const c =
    color ||
    (value >= 80
      ? BRAND.verdeFolha
      : value >= 40
      ? BRAND.douradoCafe
      : BRAND.vermelho);
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}
    >
      <div
        style={{
          flex: 1,
          height,
          borderRadius: height,
          background: `${BRAND.cafeEscuro}15`,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(value, 100)}%`,
            height: '100%',
            borderRadius: height,
            background: `linear-gradient(90deg, ${c}, ${c}cc)`,
            transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </div>
      {showLabel && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: c,
            minWidth: 36,
            textAlign: 'right',
          }}
        >
          {Math.round(value)}%
        </span>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// KPI CARD COMPONENT
// ─────────────────────────────────────────────
const KPICard = ({ label, value, subtitle, icon, color, small }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 16,
      padding: small ? '16px 18px' : '20px 24px',
      boxShadow: '0 1px 4px #2c181008, 0 4px 16px #2c181006',
      border: `1px solid ${BRAND.creme}`,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: 4,
        height: '100%',
        background: color || BRAND.douradoCafe,
        borderRadius: '16px 0 0 16px',
      }}
    />
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color || BRAND.douradoCafe}18`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon
          name={icon || 'chart'}
          size={18}
          color={color || BRAND.douradoCafe}
        />
      </div>
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: BRAND.caramelo,
          textTransform: 'uppercase',
          letterSpacing: 0.8,
        }}
      >
        {label}
      </span>
    </div>
    <div
      style={{
        fontSize: small ? 28 : 36,
        fontWeight: 800,
        color: BRAND.cafeEscuro,
        lineHeight: 1,
        fontFamily: "'DM Serif Display', serif",
      }}
    >
      {value}
    </div>
    {subtitle && (
      <span style={{ fontSize: 12, color: BRAND.caramelo }}>{subtitle}</span>
    )}
  </div>
);

// ─────────────────────────────────────────────
// GANTT CHART COMPONENT
// ─────────────────────────────────────────────
const GanttChart = ({ tarefas, obra }) => {
  const containerRef = useRef(null);
  const [filter, setFilter] = useState({
    priority: 'all',
    status: 'all',
    responsavel: 'all',
  });
  const [hoveredTask, setHoveredTask] = useState(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  const filtered = useMemo(() => {
    let f = [...tarefas];
    if (filter.priority !== 'all')
      f = f.filter((t) => t.priority === Number(filter.priority));
    if (filter.status !== 'all')
      f = f.filter((t) => t.status === filter.status);
    if (filter.responsavel !== 'all')
      f = f.filter((t) => t.responsavel === filter.responsavel);
    return f;
  }, [tarefas, filter]);

  const responsaveis = useMemo(
    () => [...new Set(tarefas.map((t) => t.responsavel))].filter(Boolean),
    [tarefas]
  );

  const allDates = useMemo(() => {
    if (!filtered.length)
      return { min: new Date(), max: new Date(), totalDays: 30 };
    const starts = filtered.map((t) => t.startDate);
    const ends = filtered.map((t) => t.realEndDate || t.endDate);
    const min = new Date(Math.min(...starts));
    const max = new Date(Math.max(...ends));
    min.setDate(min.getDate() - 2);
    max.setDate(max.getDate() + 5);
    return { min, max, totalDays: daysBetween(min, max) };
  }, [filtered]);

  const ROW_HEIGHT = 36;
  const HEADER_HEIGHT = 50;
  const LABEL_WIDTH = 280;
  const DAY_WIDTH = 28;
  const chartWidth = allDates.totalDays * DAY_WIDTH;
  const chartHeight = filtered.length * ROW_HEIGHT + HEADER_HEIGHT;
  const today = new Date();
  const todayX = daysBetween(allDates.min, today) * DAY_WIDTH;

  // Generate week markers
  const weeks = useMemo(() => {
    const w = [];
    const d = new Date(allDates.min);
    while (d <= allDates.max) {
      if (d.getDay() === 1) {
        w.push({
          date: new Date(d),
          x: daysBetween(allDates.min, d) * DAY_WIDTH,
        });
      }
      d.setDate(d.getDate() + 1);
    }
    return w;
  }, [allDates]);

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 12px #2c181008',
        border: `1px solid ${BRAND.creme}`,
      }}
    >
      {/* Filters */}
      <div
        style={{
          padding: '16px 20px',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
          borderBottom: `1px solid ${BRAND.creme}`,
          background: BRAND.offWhite,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="filter" size={16} color={BRAND.caramelo} />
          <span
            style={{ fontSize: 13, fontWeight: 600, color: BRAND.caramelo }}
          >
            Filtros:
          </span>
        </div>
        <select
          value={filter.priority}
          onChange={(e) =>
            setFilter((f) => ({ ...f, priority: e.target.value }))
          }
          style={selectStyle}
        >
          <option value="all">Todas Prioridades</option>
          {[1, 2, 3, 4, 5, 6, 7].map((p) => (
            <option key={p} value={p}>
              Prioridade {p}
            </option>
          ))}
        </select>
        <select
          value={filter.status}
          onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          style={selectStyle}
        >
          <option value="all">Todos Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={filter.responsavel}
          onChange={(e) =>
            setFilter((f) => ({ ...f, responsavel: e.target.value }))
          }
          style={selectStyle}
        >
          <option value="all">Todos Responsáveis</option>
          {responsaveis.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Gantt body */}
      <div style={{ display: 'flex', overflow: 'hidden' }}>
        {/* Task labels */}
        <div
          style={{
            width: LABEL_WIDTH,
            minWidth: LABEL_WIDTH,
            borderRight: `2px solid ${BRAND.creme}`,
            background: BRAND.offWhite,
          }}
        >
          <div
            style={{
              height: HEADER_HEIGHT,
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              borderBottom: `1px solid ${BRAND.creme}`,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: BRAND.cafeEscuro,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Atividade
            </span>
          </div>
          {filtered.map((t, i) => (
            <div
              key={t.id}
              onMouseEnter={() => setHoveredTask(t.id)}
              onMouseLeave={() => setHoveredTask(null)}
              style={{
                height: ROW_HEIGHT,
                display: 'flex',
                alignItems: 'center',
                padding: '0 12px',
                gap: 8,
                borderBottom: `1px solid ${BRAND.creme}44`,
                background:
                  hoveredTask === t.id
                    ? `${BRAND.douradoCafe}10`
                    : i % 2 === 0
                    ? '#fff'
                    : BRAND.offWhite,
                cursor: 'default',
                transition: 'background 0.15s',
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 18,
                  borderRadius: 4,
                  background: `${STATUS_COLORS[t.status]}22`,
                  color: STATUS_COLORS[t.status],
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                P{t.priority}
              </span>
              <span
                style={{
                  fontSize: 12,
                  color: BRAND.cafeEscuro,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  lineHeight: 1.2,
                }}
              >
                {t.task}
              </span>
            </div>
          ))}
        </div>

        {/* Chart area */}
        <div
          ref={containerRef}
          style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden' }}
          onScroll={(e) => setScrollLeft(e.target.scrollLeft)}
        >
          <div
            style={{
              width: chartWidth,
              minWidth: '100%',
              position: 'relative',
            }}
          >
            {/* Header with dates */}
            <div
              style={{
                height: HEADER_HEIGHT,
                display: 'flex',
                alignItems: 'flex-end',
                borderBottom: `1px solid ${BRAND.creme}`,
                position: 'relative',
              }}
            >
              {weeks.map((w, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: w.x,
                    bottom: 4,
                    fontSize: 10,
                    color: BRAND.caramelo,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    transform: 'translateX(-50%)',
                  }}
                >
                  {w.date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                  })}
                </div>
              ))}
            </div>

            {/* Task bars */}
            {filtered.map((t, i) => {
              const x = daysBetween(allDates.min, t.startDate) * DAY_WIDTH;
              const w = Math.max(t.duration * DAY_WIDTH - 4, 12);
              const barColor = STATUS_COLORS[t.status];
              const progressW = (t.progress / 100) * w;

              return (
                <div
                  key={t.id}
                  onMouseEnter={() => setHoveredTask(t.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                  style={{
                    height: ROW_HEIGHT,
                    position: 'relative',
                    borderBottom: `1px solid ${BRAND.creme}44`,
                    background:
                      hoveredTask === t.id
                        ? `${BRAND.douradoCafe}10`
                        : i % 2 === 0
                        ? '#fff'
                        : `${BRAND.offWhite}88`,
                    transition: 'background 0.15s',
                  }}
                >
                  {/* Week grid lines */}
                  {weeks.map((wk, j) => (
                    <div
                      key={j}
                      style={{
                        position: 'absolute',
                        left: wk.x,
                        top: 0,
                        bottom: 0,
                        width: 1,
                        background: `${BRAND.creme}88`,
                      }}
                    />
                  ))}

                  {/* Bar background */}
                  <div
                    style={{
                      position: 'absolute',
                      left: x,
                      top: 6,
                      width: w,
                      height: ROW_HEIGHT - 12,
                      borderRadius: 6,
                      background: `${barColor}25`,
                      border: `1px solid ${barColor}44`,
                    }}
                  />
                  {/* Progress fill */}
                  <div
                    style={{
                      position: 'absolute',
                      left: x,
                      top: 6,
                      width: progressW,
                      height: ROW_HEIGHT - 12,
                      borderRadius: t.progress >= 100 ? 6 : '6px 0 0 6px',
                      background: `linear-gradient(90deg, ${barColor}cc, ${barColor}88)`,
                      transition: 'width 0.5s ease',
                    }}
                  />
                  {/* Progress label */}
                  {t.progress > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        left: x + w + 6,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: 10,
                        fontWeight: 700,
                        color: barColor,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {t.progress}%
                    </span>
                  )}

                  {/* Tooltip on hover */}
                  {hoveredTask === t.id && (
                    <div
                      style={{
                        position: 'absolute',
                        left: x + w / 2,
                        top: -68,
                        transform: 'translateX(-50%)',
                        background: BRAND.cafeEscuro,
                        color: '#fff',
                        padding: '8px 14px',
                        borderRadius: 10,
                        fontSize: 11,
                        lineHeight: 1.5,
                        whiteSpace: 'nowrap',
                        zIndex: 100,
                        boxShadow: '0 8px 24px #2c181040',
                        pointerEvents: 'none',
                      }}
                    >
                      <strong>{t.task}</strong>
                      <br />
                      {formatDate(t.startDate)} → {formatDate(t.endDate)} |{' '}
                      {t.progress}% | {t.responsavel}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: -5,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 10,
                          height: 10,
                          background: BRAND.cafeEscuro,
                          rotate: '45deg',
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {/* Today line */}
            {todayX > 0 && todayX < chartWidth && (
              <div
                style={{
                  position: 'absolute',
                  left: todayX,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: BRAND.vermelho,
                  zIndex: 50,
                  opacity: 0.7,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: -18,
                    background: BRAND.vermelho,
                    color: '#fff',
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  HOJE
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          padding: '12px 20px',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          borderTop: `1px solid ${BRAND.creme}`,
          background: BRAND.offWhite,
        }}
      >
        {Object.entries(STATUS_LABELS).map(([k, v]) => (
          <div
            key={k}
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: 3,
                background: STATUS_COLORS[k],
              }}
            />
            <span style={{ fontSize: 11, color: BRAND.caramelo }}>{v}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 12, height: 2, background: BRAND.vermelho }} />
          <span style={{ fontSize: 11, color: BRAND.caramelo }}>Hoje</span>
        </div>
      </div>
    </div>
  );
};

const selectStyle = {
  padding: '6px 12px',
  borderRadius: 8,
  border: `1px solid ${BRAND.creme}`,
  fontSize: 12,
  color: BRAND.cafeEscuro,
  background: '#fff',
  cursor: 'pointer',
  outline: 'none',
};

// ─────────────────────────────────────────────
// AI INSIGHTS MODULE (uses Anthropic API)
// ─────────────────────────────────────────────
const AIInsightsPanel = ({ obra, tarefas, allObras, allTarefas }) => {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [whatsappMsg, setWhatsappMsg] = useState(null);

  const generateInsights = async () => {
    setLoading(true);
    const metrics = calcObraMetrics(tarefas);
    const atrasadas = tarefas.filter((t) => t.status === 'atrasado');
    const emAndamento = tarefas.filter((t) => t.status === 'em_andamento');
    const criticas = tarefas.filter(
      (t) => t.priority <= 3 && t.status !== 'concluido'
    );
    const today = new Date();
    const diasRestantes = daysBetween(today, obra.prazoFinal);

    const prompt = `Você é um consultor de gestão de implantações de franquias do Ponto Alpha Café. Analise esta obra e gere insights executivos em português brasileiro. Responda APENAS com JSON válido, sem markdown.

OBRA: ${obra.nome} — ${obra.cidade}
Responsável: ${obra.responsavel}
Prazo Final: ${formatDate(obra.prazoFinal)} (${diasRestantes} dias restantes)
Avanço Físico: ${metrics.avancoFisico.toFixed(1)}%
PPC: ${metrics.ppc.toFixed(1)}%

RESUMO:
- Total tarefas: ${metrics.total}
- Concluídas: ${metrics.concluidas}
- Em andamento: ${metrics.emAndamento}
- Pendentes: ${metrics.pendentes}
- Atrasadas: ${metrics.atrasadas}
- Não iniciadas: ${metrics.naoIniciadas}

TAREFAS ATRASADAS: ${atrasadas.map((t) => t.task).join(', ') || 'nenhuma'}
TAREFAS CRÍTICAS (P1-P3 não concluídas): ${
      criticas.map((t) => `${t.task} (${t.progress}%)`).join(', ') || 'nenhuma'
    }

Gere um JSON com esta estrutura exata:
{"situacao":"texto sobre situação geral da obra (2-3 frases)","riscos":["risco 1","risco 2","risco 3"],"prioridades":["prioridade 1","prioridade 2","prioridade 3"],"acoes":["ação imediata 1","ação 2","ação 3"],"whatsapp":"mensagem pronta para WhatsApp com resumo executivo da obra, emojis e formatação para envio direto"}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      const text = data.content?.map((c) => c.text || '').join('') || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      setInsights(parsed);
      setWhatsappMsg(parsed.whatsapp);
    } catch (err) {
      setInsights({
        situacao: `A obra ${obra.nome} está com ${metrics.avancoFisico.toFixed(
          1
        )}% de avanço físico. ${
          metrics.atrasadas > 0
            ? `Existem ${metrics.atrasadas} tarefas atrasadas que precisam de atenção imediata.`
            : 'O andamento está dentro do esperado.'
        } ${
          diasRestantes > 0
            ? `Restam ${diasRestantes} dias para o prazo final.`
            : `A obra já ultrapassou o prazo final em ${Math.abs(
                diasRestantes
              )} dias.`
        }`,
        riscos:
          atrasadas.length > 0
            ? [
                `${atrasadas.length} tarefa(s) atrasada(s) podem impactar o cronograma`,
                `Avanço de ${metrics.avancoFisico.toFixed(
                  0
                )}% pode ser insuficiente para o prazo`,
                'Dependências bloqueadoras entre etapas',
              ]
            : [
                'Monitorar tarefas em andamento para evitar atrasos',
                'Garantir aprovações em tempo hábil',
                'Acompanhar fornecedores e entregas',
              ],
        prioridades: criticas
          .slice(0, 3)
          .map((t) => `Concluir: ${t.task} (${t.progress}%)`),
        acoes: [
          'Reunião de alinhamento com responsáveis das tarefas atrasadas',
          'Revisar cronograma de entregas dos fornecedores',
          'Atualizar status das tarefas em andamento',
        ],
        whatsapp: `☕ *ALPHA IMPLANTAÇÕES*\n📍 ${
          obra.nome
        }\n\n📊 Avanço: ${metrics.avancoFisico.toFixed(0)}%\n✅ Concluídas: ${
          metrics.concluidas
        }/${metrics.total}\n⚠️ Atrasadas: ${
          metrics.atrasadas
        }\n📅 Prazo: ${formatDate(obra.prazoFinal)}\n\n${
          metrics.atrasadas > 0
            ? '🔴 Atenção: existem tarefas atrasadas!'
            : '🟢 Obra no prazo.'
        }`,
      });
      setWhatsappMsg(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    generateInsights();
  }, [obra.id]);

  if (loading) {
    return (
      <div
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
          border: `1px solid ${BRAND.creme}`,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: `3px solid ${BRAND.creme}`,
            borderTopColor: BRAND.douradoCafe,
            borderRadius: '50%',
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: BRAND.caramelo, fontSize: 14 }}>
          Analisando dados da obra com IA...
        </p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (!insights) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Situação */}
      <div
        style={{
          background: `linear-gradient(135deg, ${BRAND.cafeEscuro}, ${BRAND.marromQuente})`,
          borderRadius: 16,
          padding: 24,
          color: '#fff',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#ffffff22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="ai" size={20} color={BRAND.douradoCafe} />
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 700,
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              Análise da IA
            </h3>
            <span style={{ fontSize: 11, opacity: 0.7 }}>Atualizado agora</span>
          </div>
          <button
            onClick={generateInsights}
            style={{
              marginLeft: 'auto',
              background: '#ffffff22',
              border: 'none',
              borderRadius: 8,
              padding: '6px 12px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
            }}
          >
            <Icon name="refresh" size={14} color="#fff" /> Atualizar
          </button>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0, opacity: 0.95 }}>
          {insights.situacao}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {/* Riscos */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 20,
            border: `1px solid ${BRAND.creme}`,
          }}
        >
          <h4
            style={{
              margin: '0 0 12px',
              fontSize: 14,
              fontWeight: 700,
              color: BRAND.vermelho,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="alert" size={16} color={BRAND.vermelho} /> Riscos
            Identificados
          </h4>
          {insights.riscos?.map((r, i) => (
            <div
              key={i}
              style={{
                padding: '8px 0',
                borderBottom:
                  i < insights.riscos.length - 1
                    ? `1px solid ${BRAND.creme}`
                    : 'none',
                fontSize: 13,
                color: BRAND.cafeEscuro,
                display: 'flex',
                gap: 8,
              }}
            >
              <span
                style={{
                  color: BRAND.vermelho,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}.
              </span>
              {r}
            </div>
          ))}
        </div>

        {/* Prioridades */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 20,
            border: `1px solid ${BRAND.creme}`,
          }}
        >
          <h4
            style={{
              margin: '0 0 12px',
              fontSize: 14,
              fontWeight: 700,
              color: BRAND.douradoCafe,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="check" size={16} color={BRAND.douradoCafe} />{' '}
            Prioridades
          </h4>
          {insights.prioridades?.map((p, i) => (
            <div
              key={i}
              style={{
                padding: '8px 0',
                borderBottom:
                  i < insights.prioridades.length - 1
                    ? `1px solid ${BRAND.creme}`
                    : 'none',
                fontSize: 13,
                color: BRAND.cafeEscuro,
                display: 'flex',
                gap: 8,
              }}
            >
              <span
                style={{
                  color: BRAND.douradoCafe,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {i + 1}.
              </span>
              {p}
            </div>
          ))}
        </div>

        {/* Ações */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 20,
            border: `1px solid ${BRAND.creme}`,
          }}
        >
          <h4
            style={{
              margin: '0 0 12px',
              fontSize: 14,
              fontWeight: 700,
              color: BRAND.verdeFolha,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="arrow" size={16} color={BRAND.verdeFolha} /> Próximos
            Passos
          </h4>
          {insights.acoes?.map((a, i) => (
            <div
              key={i}
              style={{
                padding: '8px 0',
                borderBottom:
                  i < insights.acoes.length - 1
                    ? `1px solid ${BRAND.creme}`
                    : 'none',
                fontSize: 13,
                color: BRAND.cafeEscuro,
                display: 'flex',
                gap: 8,
              }}
            >
              <span
                style={{
                  color: BRAND.verdeFolha,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                →
              </span>
              {a}
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp message */}
      {insights.whatsapp && (
        <div
          style={{
            background: '#dcf8c6',
            borderRadius: 16,
            padding: 20,
            border: '1px solid #b5e4a0',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Icon name="whatsapp" size={18} color="#25D366" />
            <h4
              style={{
                margin: 0,
                fontSize: 14,
                fontWeight: 700,
                color: '#1b5e20',
              }}
            >
              Mensagem para WhatsApp
            </h4>
            <button
              onClick={() => navigator.clipboard?.writeText(insights.whatsapp)}
              style={{
                marginLeft: 'auto',
                background: '#25D366',
                border: 'none',
                borderRadius: 8,
                padding: '6px 14px',
                color: '#fff',
                cursor: 'pointer',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              Copiar
            </button>
          </div>
          <pre
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.6,
              color: '#1b3a1b',
              whiteSpace: 'pre-wrap',
              fontFamily: 'inherit',
            }}
          >
            {insights.whatsapp}
          </pre>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// OBRA DETAIL VIEW
// ─────────────────────────────────────────────
const ObraDetail = ({ obra, tarefas, onBack, allObras, allTarefas }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const metrics = useMemo(() => calcObraMetrics(tarefas), [tarefas]);
  const today = new Date();
  const diasRestantes = daysBetween(today, obra.prazoFinal);

  const obraStatus =
    diasRestantes < 0
      ? 'atrasado'
      : diasRestantes < 14
      ? 'pendente'
      : 'em_andamento';

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: 'chart' },
    { id: 'gantt', label: 'Cronograma Gantt', icon: 'gantt' },
    { id: 'ai', label: 'IA Insights', icon: 'ai' },
    { id: 'tarefas', label: 'Tarefas', icon: 'check' },
    { id: 'whatsapp', label: 'Relatórios', icon: 'whatsapp' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${BRAND.cafeEscuro}, ${BRAND.marromQuente}ee)`,
          borderRadius: 20,
          padding: '24px 28px',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 120,
            height: 120,
            borderRadius: '50%',
            background: `${BRAND.douradoCafe}15`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -30,
            right: 40,
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `${BRAND.douradoCafe}10`,
          }}
        />
        <button
          onClick={onBack}
          style={{
            background: '#ffffff22',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          <Icon name="back" size={16} color="#fff" /> Voltar
        </button>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              {obra.nome}
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, opacity: 0.8 }}>
              📍 {obra.cidade} — {obra.endereco}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.7 }}>
              👤 Responsável: {obra.responsavel} | 📅 Prazo:{' '}
              {formatDate(obra.prazoFinal)}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div
              style={{
                background: '#ffffff22',
                borderRadius: 12,
                padding: '12px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  fontFamily: "'DM Serif Display', serif",
                }}
              >
                {metrics.avancoFisico.toFixed(0)}%
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Avanço Físico</div>
            </div>
            <div
              style={{
                background: '#ffffff22',
                borderRadius: 12,
                padding: '12px 20px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: diasRestantes < 0 ? '#ff6b6b' : BRAND.verdeClaro,
                  fontFamily: "'DM Serif Display', serif",
                }}
              >
                {diasRestantes}
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>Dias Restantes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '0 4px' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: 'none',
              background: activeTab === tab.id ? BRAND.cafeEscuro : '#fff',
              color: activeTab === tab.id ? '#fff' : BRAND.caramelo,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
              boxShadow:
                activeTab === tab.id
                  ? `0 4px 12px ${BRAND.cafeEscuro}40`
                  : '0 1px 4px #0001',
            }}
          >
            <Icon
              name={tab.icon}
              size={16}
              color={activeTab === tab.id ? BRAND.douradoCafe : BRAND.caramelo}
            />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 12,
            }}
          >
            <KPICard
              label="PPC"
              value={`${metrics.ppc.toFixed(0)}%`}
              subtitle="Planos Concluídos"
              icon="check"
              color={BRAND.verdeFolha}
              small
            />
            <KPICard
              label="Concluídas"
              value={metrics.concluidas}
              subtitle={`de ${metrics.total} tarefas`}
              icon="check"
              color={BRAND.verdeFolha}
              small
            />
            <KPICard
              label="Em Andamento"
              value={metrics.emAndamento}
              icon="clock"
              color={BRAND.douradoCafe}
              small
            />
            <KPICard
              label="Atrasadas"
              value={metrics.atrasadas}
              icon="alert"
              color={BRAND.vermelho}
              small
            />
            <KPICard
              label="Pendentes"
              value={metrics.pendentes}
              icon="calendar"
              color={BRAND.amarelo}
              small
            />
            <KPICard
              label="Não Iniciadas"
              value={metrics.naoIniciadas}
              icon="file"
              color="#9e9e9e"
              small
            />
          </div>

          {/* Progress by Priority */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${BRAND.creme}`,
            }}
          >
            <h3
              style={{
                margin: '0 0 16px',
                fontSize: 16,
                fontWeight: 700,
                color: BRAND.cafeEscuro,
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              Progresso por Prioridade
            </h3>
            {[1, 2, 3, 4, 5, 6, 7].map((p) => {
              const pTasks = tarefas.filter((t) => t.priority === p);
              if (!pTasks.length) return null;
              const done = pTasks.filter(
                (t) => t.status === 'concluido'
              ).length;
              const pct = (done / pTasks.length) * 100;
              return (
                <div
                  key={p}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: BRAND.caramelo,
                      minWidth: 90,
                    }}
                  >
                    Prioridade {p}
                  </span>
                  <div style={{ flex: 1 }}>
                    <ProgressBar value={pct} height={10} />
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: BRAND.caramelo,
                      minWidth: 50,
                    }}
                  >
                    {done}/{pTasks.length}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Tasks by Category */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${BRAND.creme}`,
            }}
          >
            <h3
              style={{
                margin: '0 0 16px',
                fontSize: 16,
                fontWeight: 700,
                color: BRAND.cafeEscuro,
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              Progresso por Categoria
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              {Object.entries(_.groupBy(tarefas, 'category')).map(
                ([cat, tasks]) => {
                  const done = tasks.filter(
                    (t) => t.status === 'concluido'
                  ).length;
                  const pct = (done / tasks.length) * 100;
                  return (
                    <div
                      key={cat}
                      style={{
                        padding: 12,
                        borderRadius: 10,
                        background: BRAND.offWhite,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: 6,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: BRAND.cafeEscuro,
                          }}
                        >
                          {cat}
                        </span>
                        <span style={{ fontSize: 11, color: BRAND.caramelo }}>
                          {done}/{tasks.length}
                        </span>
                      </div>
                      <ProgressBar value={pct} height={6} showLabel={false} />
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gantt' && <GanttChart tarefas={tarefas} obra={obra} />}

      {activeTab === 'ai' && (
        <AIInsightsPanel
          obra={obra}
          tarefas={tarefas}
          allObras={allObras}
          allTarefas={allTarefas}
        />
      )}

      {activeTab === 'tarefas' && (
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            overflow: 'hidden',
            border: `1px solid ${BRAND.creme}`,
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: BRAND.cafeEscuro, color: '#fff' }}>
                  {[
                    'P',
                    'Tarefa',
                    'Categoria',
                    'Status',
                    'Progresso',
                    'Início',
                    'Prazo',
                    'Responsável',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '12px 14px',
                        textAlign: 'left',
                        fontSize: 11,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: 0.5,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tarefas.map((t, i) => (
                  <tr
                    key={t.id}
                    style={{
                      borderBottom: `1px solid ${BRAND.creme}`,
                      background: i % 2 === 0 ? '#fff' : BRAND.offWhite,
                    }}
                  >
                    <td style={{ padding: '10px 14px' }}>
                      <span
                        style={{
                          background: `${BRAND.douradoCafe}22`,
                          color: BRAND.cafeEscuro,
                          padding: '2px 8px',
                          borderRadius: 6,
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        fontWeight: 500,
                        maxWidth: 250,
                      }}
                    >
                      {t.task}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        color: BRAND.caramelo,
                        fontSize: 12,
                      }}
                    >
                      {t.category}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <StatusBadge status={t.status} small />
                    </td>
                    <td style={{ padding: '10px 14px', width: 120 }}>
                      <ProgressBar value={t.progress} height={6} />
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        color: BRAND.caramelo,
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(t.startDate)}
                    </td>
                    <td
                      style={{
                        padding: '10px 14px',
                        color: BRAND.caramelo,
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatDate(t.endDate)}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12 }}>
                      {t.responsavel}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'whatsapp' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${BRAND.creme}`,
            }}
          >
            <h3
              style={{
                margin: '0 0 16px',
                fontSize: 16,
                fontWeight: 700,
                color: BRAND.cafeEscuro,
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              Relatórios Automáticos
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
              }}
            >
              {[
                {
                  title: 'Resumo Executivo',
                  desc: 'Visão geral da obra com indicadores principais',
                  icon: 'chart',
                },
                {
                  title: 'Relatório Semanal',
                  desc: 'Evolução da última semana com comparativos',
                  icon: 'calendar',
                },
                {
                  title: 'Pendências',
                  desc: 'Lista de todas as tarefas pendentes e atrasadas',
                  icon: 'alert',
                },
                {
                  title: 'Urgências',
                  desc: 'Tarefas críticas que precisam de ação imediata',
                  icon: 'clock',
                },
                {
                  title: 'Comparativo',
                  desc: 'Comparação entre obras em andamento',
                  icon: 'building',
                },
                {
                  title: 'Mensagem WhatsApp',
                  desc: 'Gerar mensagem pronta para envio',
                  icon: 'whatsapp',
                },
              ].map((r) => (
                <button
                  key={r.title}
                  style={{
                    padding: 18,
                    borderRadius: 14,
                    border: `1px solid ${BRAND.creme}`,
                    background: BRAND.offWhite,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${BRAND.douradoCafe}15`;
                    e.currentTarget.style.borderColor = BRAND.douradoCafe;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = BRAND.offWhite;
                    e.currentTarget.style.borderColor = BRAND.creme;
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Icon name={r.icon} size={18} color={BRAND.douradoCafe} />
                    <span
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: BRAND.cafeEscuro,
                      }}
                    >
                      {r.title}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: BRAND.caramelo,
                      lineHeight: 1.4,
                    }}
                  >
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick WhatsApp Preview */}
          <div
            style={{
              background: '#dcf8c6',
              borderRadius: 16,
              padding: 20,
              border: '1px solid #b5e4a0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              <Icon name="whatsapp" size={18} color="#25D366" />
              <h4
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#1b5e20',
                }}
              >
                Prévia WhatsApp — Resumo Semanal
              </h4>
              <button
                onClick={() => {
                  const msg = `☕ *PONTO ALPHA — IMPLANTAÇÕES*\n📍 ${
                    obra.nome
                  }\n📅 ${formatDate(
                    new Date()
                  )}\n\n📊 *Avanço:* ${metrics.avancoFisico.toFixed(
                    0
                  )}%\n✅ Concluídas: ${metrics.concluidas}/${
                    metrics.total
                  }\n🔄 Em andamento: ${metrics.emAndamento}\n⚠️ Atrasadas: ${
                    metrics.atrasadas
                  }\n📅 Prazo: ${formatDate(
                    obra.prazoFinal
                  )} (${diasRestantes}d)\n\n${
                    metrics.atrasadas > 0
                      ? '🔴 *Atenção:* Existem tarefas atrasadas!'
                      : '🟢 Obra dentro do cronograma.'
                  }\n\n_Alpha Implantações_`;
                  navigator.clipboard?.writeText(msg);
                }}
                style={{
                  marginLeft: 'auto',
                  background: '#25D366',
                  border: 'none',
                  borderRadius: 8,
                  padding: '6px 14px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                Copiar
              </button>
            </div>
            <pre
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.7,
                color: '#1b3a1b',
                whiteSpace: 'pre-wrap',
                fontFamily: 'inherit',
              }}
            >
              {`☕ *PONTO ALPHA — IMPLANTAÇÕES*
📍 ${obra.nome}
📅 ${formatDate(new Date())}

📊 *Avanço:* ${metrics.avancoFisico.toFixed(0)}%
✅ Concluídas: ${metrics.concluidas}/${metrics.total}
🔄 Em andamento: ${metrics.emAndamento}
⚠️ Atrasadas: ${metrics.atrasadas}
📅 Prazo: ${formatDate(obra.prazoFinal)} (${diasRestantes}d)

${
  metrics.atrasadas > 0
    ? '🔴 *Atenção:* Existem tarefas atrasadas!'
    : '🟢 Obra dentro do cronograma.'
}

_Alpha Implantações_`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────
// NEW OBRA MODAL
// ─────────────────────────────────────────────
const NovaObraModal = ({ onClose, onCreate }) => {
  const [form, setForm] = useState({
    nome: '',
    cidade: '',
    endereco: '',
    responsavel: '',
    prazoFinal: '',
    observacoes: '',
  });

  const handleSubmit = () => {
    if (!form.nome || !form.cidade) return;
    const newObra = {
      id: `obra-${Date.now()}`,
      ...form,
      dataBase: new Date(),
      prazoFinal: form.prazoFinal
        ? new Date(form.prazoFinal)
        : new Date(Date.now() + 120 * 86400000),
      status: 'nao_iniciado',
    };
    onCreate(newObra);
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: `1px solid ${BRAND.creme}`,
    fontSize: 14,
    color: BRAND.cafeEscuro,
    outline: 'none',
    background: BRAND.offWhite,
    boxSizing: 'border-box',
  };

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600,
    color: BRAND.caramelo,
    marginBottom: 4,
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#00000066',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: 32,
          maxWidth: 540,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px #0004',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 700,
              color: BRAND.cafeEscuro,
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            Nova Implantação
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <Icon name="close" size={20} color={BRAND.caramelo} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Nome da Obra / Unidade</label>
            <input
              style={inputStyle}
              placeholder="Ex: Ponto Alpha — Shopping XYZ"
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>
          <div
            style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}
          >
            <div>
              <label style={labelStyle}>Cidade</label>
              <input
                style={inputStyle}
                placeholder="Ex: Brasília"
                value={form.cidade}
                onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>Responsável</label>
              <input
                style={inputStyle}
                placeholder="Ex: Licia"
                value={form.responsavel}
                onChange={(e) =>
                  setForm({ ...form, responsavel: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Endereço</label>
            <input
              style={inputStyle}
              placeholder="Endereço completo"
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>Prazo Final</label>
            <input
              style={inputStyle}
              type="date"
              value={form.prazoFinal}
              onChange={(e) => setForm({ ...form, prazoFinal: e.target.value })}
            />
          </div>
          <div>
            <label style={labelStyle}>Observações</label>
            <textarea
              style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
              placeholder="Notas sobre a implantação..."
              value={form.observacoes}
              onChange={(e) =>
                setForm({ ...form, observacoes: e.target.value })
              }
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 10,
              border: `1px solid ${BRAND.creme}`,
              background: '#fff',
              color: BRAND.caramelo,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: 10,
              border: 'none',
              background: `linear-gradient(135deg, ${BRAND.cafeEscuro}, ${BRAND.marromQuente})`,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: `0 4px 16px ${BRAND.cafeEscuro}40`,
            }}
          >
            Criar Implantação
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN APP COMPONENT
// ─────────────────────────────────────────────
export default function AlphaImplantacoes() {
  const [data] = useState(() => generateDemoData());
  const [selectedObra, setSelectedObra] = useState(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { obras, obrasTarefas } = data;

  // Global metrics
  const globalMetrics = useMemo(() => {
    const allTasks = Object.values(obrasTarefas).flat();
    const total = allTasks.length;
    const concluidas = allTasks.filter((t) => t.status === 'concluido').length;
    const atrasadas = allTasks.filter((t) => t.status === 'atrasado').length;
    const emAndamento = allTasks.filter(
      (t) => t.status === 'em_andamento'
    ).length;
    const avgProgress =
      total > 0 ? allTasks.reduce((a, t) => a + t.progress, 0) / total : 0;

    return {
      total,
      concluidas,
      atrasadas,
      emAndamento,
      avgProgress,
      obrasTotal: obras.length,
    };
  }, [obras, obrasTarefas]);

  // Ranking by risk
  const obrasRanked = useMemo(() => {
    return obras
      .map((o) => {
        const m = calcObraMetrics(obrasTarefas[o.id]);
        const diasRestantes = daysBetween(new Date(), o.prazoFinal);
        const riskScore =
          m.atrasadas * 10 +
          (m.avancoFisico < 50 ? 20 : 0) +
          (diasRestantes < 0 ? 30 : diasRestantes < 14 ? 15 : 0);
        return { ...o, metrics: m, diasRestantes, riskScore };
      })
      .sort((a, b) => b.riskScore - a.riskScore);
  }, [obras, obrasTarefas]);

  // Most delayed tasks across all obras
  const topGargalos = useMemo(() => {
    return Object.entries(obrasTarefas)
      .flatMap(([obraId, tasks]) =>
        tasks.map((t) => ({
          ...t,
          obraId,
          obraNome: obras.find((o) => o.id === obraId)?.nome,
        }))
      )
      .filter((t) => t.status === 'atrasado')
      .sort((a, b) => {
        const aDelay = daysBetween(a.endDate, new Date());
        const bDelay = daysBetween(b.endDate, new Date());
        return bDelay - aDelay;
      })
      .slice(0, 5);
  }, [obras, obrasTarefas]);

  if (selectedObra) {
    const obra = obras.find((o) => o.id === selectedObra);
    return (
      <div
        style={{
          minHeight: '100vh',
          background: BRAND.offWhite,
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        }}
      >
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap"
          rel="stylesheet"
        />
        {/* Top bar */}
        <div
          style={{
            background: BRAND.cafeEscuro,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            position: 'sticky',
            top: 0,
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: BRAND.douradoCafe,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              color: BRAND.cafeEscuro,
              fontSize: 14,
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            α
          </div>
          <span
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            Alpha Implantações
          </span>
          <span
            style={{ color: BRAND.douradoCafe, fontSize: 12, marginLeft: 4 }}
          >
            / {obra?.nome}
          </span>
        </div>
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '20px 16px 40px',
          }}
        >
          <ObraDetail
            obra={obra}
            tarefas={obrasTarefas[selectedObra]}
            onBack={() => setSelectedObra(null)}
            allObras={obras}
            allTarefas={obrasTarefas}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: BRAND.offWhite,
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Serif+Display&display=swap"
        rel="stylesheet"
      />

      {/* Top bar */}
      <div
        style={{
          background: BRAND.cafeEscuro,
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 2px 12px #0003',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: BRAND.douradoCafe,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            color: BRAND.cafeEscuro,
            fontSize: 16,
            fontFamily: "'DM Serif Display', serif",
          }}
        >
          α
        </div>
        <div>
          <div
            style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: 16,
              fontFamily: "'DM Serif Display', serif",
              lineHeight: 1.2,
            }}
          >
            Alpha Implantações
          </div>
          <div style={{ color: BRAND.douradoCafe, fontSize: 11 }}>
            Gestão de Obras — Ponto Alpha Café
          </div>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          style={{
            marginLeft: 'auto',
            background: `linear-gradient(135deg, ${BRAND.douradoCafe}, ${BRAND.caramelo})`,
            border: 'none',
            borderRadius: 10,
            padding: '8px 18px',
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: `0 2px 10px ${BRAND.douradoCafe}66`,
          }}
        >
          <Icon name="plus" size={16} color="#fff" /> Nova Implantação
        </button>
      </div>

      <div
        style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 16px 40px' }}
      >
        {/* Hero Section */}
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND.cafeEscuro}, ${BRAND.marromQuente})`,
            borderRadius: 24,
            padding: '32px 28px',
            color: '#fff',
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -40,
              right: -40,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: `${BRAND.douradoCafe}10`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: -50,
              right: 80,
              width: 140,
              height: 140,
              borderRadius: '50%',
              background: `${BRAND.douradoCafe}08`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 30,
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: `${BRAND.douradoCafe}12`,
            }}
          />
          <h1
            style={{
              margin: 0,
              fontSize: 28,
              fontWeight: 700,
              fontFamily: "'DM Serif Display', serif",
              lineHeight: 1.2,
            }}
          >
            Painel de Gestão
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: 14,
              opacity: 0.75,
              maxWidth: 600,
              lineHeight: 1.5,
            }}
          >
            Acompanhe todas as implantações das unidades Ponto Alpha Café em
            tempo real. Dashboard executivo com IA integrada.
          </p>
        </div>

        {/* KPIs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            marginBottom: 24,
          }}
        >
          <KPICard
            label="Obras Ativas"
            value={globalMetrics.obrasTotal}
            icon="building"
            color={BRAND.cafeEscuro}
          />
          <KPICard
            label="Tarefas Totais"
            value={globalMetrics.total}
            icon="file"
            color={BRAND.douradoCafe}
          />
          <KPICard
            label="Concluídas"
            value={globalMetrics.concluidas}
            subtitle={`${(
              (globalMetrics.concluidas / globalMetrics.total) *
              100
            ).toFixed(0)}% do total`}
            icon="check"
            color={BRAND.verdeFolha}
          />
          <KPICard
            label="Atrasadas"
            value={globalMetrics.atrasadas}
            subtitle="Requer atenção"
            icon="alert"
            color={BRAND.vermelho}
          />
          <KPICard
            label="Avanço Médio"
            value={`${globalMetrics.avgProgress.toFixed(0)}%`}
            icon="chart"
            color={BRAND.caramelo}
          />
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 20,
            marginBottom: 24,
          }}
        >
          {/* Obras Ranking */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${BRAND.creme}`,
              gridColumn: 'span 1',
            }}
          >
            <h3
              style={{
                margin: '0 0 16px',
                fontSize: 17,
                fontWeight: 700,
                color: BRAND.cafeEscuro,
                fontFamily: "'DM Serif Display', serif",
              }}
            >
              Ranking de Risco
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {obrasRanked.map((o, i) => (
                <button
                  key={o.id}
                  onClick={() => setSelectedObra(o.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: `1px solid ${BRAND.creme}`,
                    background:
                      i === 0 ? `${BRAND.vermelho}08` : BRAND.offWhite,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    width: '100%',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 4px 12px #0001';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background:
                        i === 0
                          ? `${BRAND.vermelho}20`
                          : `${BRAND.douradoCafe}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 16,
                      color: i === 0 ? BRAND.vermelho : BRAND.douradoCafe,
                      fontFamily: "'DM Serif Display', serif",
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: BRAND.cafeEscuro,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {o.nome}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: BRAND.caramelo,
                        marginTop: 2,
                      }}
                    >
                      📍 {o.cidade} • 👤 {o.responsavel}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color:
                          o.metrics.avancoFisico >= 80
                            ? BRAND.verdeFolha
                            : o.metrics.avancoFisico >= 40
                            ? BRAND.douradoCafe
                            : BRAND.vermelho,
                      }}
                    >
                      {o.metrics.avancoFisico.toFixed(0)}%
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color:
                          o.diasRestantes < 0 ? BRAND.vermelho : BRAND.caramelo,
                      }}
                    >
                      {o.diasRestantes < 0
                        ? `${Math.abs(o.diasRestantes)}d atrasada`
                        : `${o.diasRestantes}d restantes`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Gargalos */}
          <div
            style={{
              background: '#fff',
              borderRadius: 16,
              padding: 24,
              border: `1px solid ${BRAND.creme}`,
            }}
          >
            <h3
              style={{
                margin: '0 0 16px',
                fontSize: 17,
                fontWeight: 700,
                color: BRAND.cafeEscuro,
                fontFamily: "'DM Serif Display', serif",
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <Icon name="alert" size={20} color={BRAND.vermelho} /> Gargalos
              Principais
            </h3>
            {topGargalos.length === 0 ? (
              <p
                style={{
                  color: BRAND.caramelo,
                  fontSize: 14,
                  textAlign: 'center',
                  padding: 20,
                }}
              >
                Nenhum gargalo identificado
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topGargalos.map((t, i) => {
                  const delay = daysBetween(t.endDate, new Date());
                  return (
                    <div
                      key={i}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 10,
                        background: `${BRAND.vermelho}06`,
                        border: `1px solid ${BRAND.vermelho}15`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 8,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: BRAND.cafeEscuro,
                            }}
                          >
                            {t.task}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: BRAND.caramelo,
                              marginTop: 2,
                            }}
                          >
                            {t.obraNome}
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: BRAND.vermelho,
                            whiteSpace: 'nowrap',
                            background: `${BRAND.vermelho}12`,
                            padding: '2px 8px',
                            borderRadius: 6,
                          }}
                        >
                          -{delay}d
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* All Obras List */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: 24,
            border: `1px solid ${BRAND.creme}`,
          }}
        >
          <h3
            style={{
              margin: '0 0 16px',
              fontSize: 17,
              fontWeight: 700,
              color: BRAND.cafeEscuro,
              fontFamily: "'DM Serif Display', serif",
            }}
          >
            Todas as Implantações
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 14,
            }}
          >
            {obrasRanked.map((o) => {
              const statusColor =
                o.diasRestantes < 0
                  ? BRAND.vermelho
                  : o.diasRestantes < 14
                  ? BRAND.amarelo
                  : BRAND.verdeFolha;
              const statusLabel =
                o.diasRestantes < 0
                  ? 'Atrasada'
                  : o.diasRestantes < 14
                  ? 'Em Risco'
                  : 'No Prazo';
              return (
                <button
                  key={o.id}
                  onClick={() => setSelectedObra(o.id)}
                  style={{
                    padding: 20,
                    borderRadius: 16,
                    border: `1px solid ${BRAND.creme}`,
                    background: '#fff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 8px 24px ${BRAND.cafeEscuro}12`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: 4,
                      height: '100%',
                      background: statusColor,
                    }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <div>
                      <h4
                        style={{
                          margin: 0,
                          fontSize: 15,
                          fontWeight: 700,
                          color: BRAND.cafeEscuro,
                        }}
                      >
                        {o.nome}
                      </h4>
                      <p
                        style={{
                          margin: '4px 0 0',
                          fontSize: 12,
                          color: BRAND.caramelo,
                        }}
                      >
                        📍 {o.cidade} • 👤 {o.responsavel}
                      </p>
                    </div>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 8,
                        background: `${statusColor}18`,
                        color: statusColor,
                      }}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <ProgressBar value={o.metrics.avancoFisico} height={8} />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginTop: 12,
                      fontSize: 12,
                      color: BRAND.caramelo,
                    }}
                  >
                    <span>
                      ✅ {o.metrics.concluidas}/{o.metrics.total} tarefas
                    </span>
                    <span>⚠️ {o.metrics.atrasadas} atrasadas</span>
                    <span>📅 {formatDate(o.prazoFinal)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showNewModal && (
        <NovaObraModal
          onClose={() => setShowNewModal(false)}
          onCreate={(newObra) => {
            setShowNewModal(false);
          }}
        />
      )}

      {/* Global styles */}
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${BRAND.creme}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb { background: ${BRAND.caramelo}66; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${BRAND.caramelo}; }
        @media (max-width: 768px) {
          h1 { font-size: 22px !important; }
        }
        @media (max-width: 640px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
          div[style*="grid-template-columns: repeat(auto-fit, minmax(180px"] { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </div>
  );
}
