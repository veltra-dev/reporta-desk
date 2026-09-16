import { Octokit } from '@octokit/rest';
import { Ticket, TicketComment, TicketPriority, TicketStatus, TicketCategory, ClientMetadata } from './types';

// Mock data em memória para visualização instantânea antes de configurar as chaves
let mockTickets: Ticket[] = [
  {
    id: 101,
    title: 'Falha intermitente na emissão de relatórios consolidados em PDF',
    body: 'Identificamos que ao tentar exportar o relatório financeiro do mês de Agosto com mais de 500 registros, a tela entra em carregamento infinito e retorna erro de timeout 504 no servidor.\n\n### Passos para reproduzir:\n1. Acesse o menu Financeiro > Relatórios\n2. Filtre pelo período de 01/08 a 31/08\n3. Clique em "Exportar PDF Consolidado"\n\n**Impacto**: Alto, nossa diretoria precisa fechar a auditoria até amanhã.',
    status: 'em_andamento',
    priority: 'alta',
    category: 'bug',
    clientName: 'Mariana Silveira',
    clientEmail: 'mariana.silveira@acme-corp.com',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 horas atrás
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    commentsCount: 2,
    githubUrl: 'https://github.com/empresa/repo-chamados/issues/101',
    comments: [
      {
        id: 1,
        body: 'Olá Mariana, nossa equipe de infraestrutura já isolou a consulta lenta no banco de dados e está aplicando uma otimização de índice. Atualizaremos você assim que o deploy for finalizado.',
        authorName: 'Gabriel Santos (Dev/Suporte)',
        authorEmail: 'suporte@reportadesk.internal',
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        isStaff: true,
      },
      {
        id: 2,
        body: 'Muito obrigada pelo retorno rápido, Gabriel! Fico no aguardo para testar.',
        authorName: 'Mariana Silveira',
        authorEmail: 'mariana.silveira@acme-corp.com',
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        isStaff: false,
      }
    ]
  },
  {
    id: 102,
    title: 'Solicitação de acesso adicional para novo analista financeiro',
    body: 'Precisamos de liberação de permissão de visualização e emissão de notas fiscais para o colaborador recém-contratado: Lucas Prado (lucas.prado@acme-corp.com).',
    status: 'novo',
    priority: 'media',
    category: 'acesso',
    clientName: 'Carlos Mendonça',
    clientEmail: 'carlos.mendonca@acme-corp.com',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    commentsCount: 0,
    githubUrl: 'https://github.com/empresa/repo-chamados/issues/102',
    comments: []
  },
  {
    id: 103,
    title: 'Dúvida sobre cobrança proporcional na renovação anual',
    body: 'Gostaríamos de entender o cálculo da fatura #INV-9821 recebida hoje referente ao upgrade de 10 para 25 licenças.',
    status: 'resolvido',
    priority: 'baixa',
    category: 'faturamento',
    clientName: 'Juliana Rocha',
    clientEmail: 'juliana.rocha@techhub.io',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
    commentsCount: 1,
    githubUrl: 'https://github.com/empresa/repo-chamados/issues/103',
    comments: [
      {
        id: 3,
        body: 'Juliana, encaminhamos o demonstrativo detalhado da cobrança proporcional (prorata) para o seu e-mail financeiro. O valor foi ajustado com base nos 14 dias restantes do ciclo.',
        authorName: 'Equipe Financeira (ReportaDesk)',
        createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
        isStaff: true,
      }
    ]
  }
];

export function getGitHubConfig() {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;

  const isConfigured = Boolean(token && owner && repo);

  return {
    isConfigured,
    token,
    owner,
    repo,
  };
}

function getOctokitClient() {
  const { token } = getGitHubConfig();
  if (!token) return null;
  return new Octokit({ auth: token });
}

// Helpers para extrair metadados ocultos do corpo da Issue
function extractMetadata(issueBody: string = ''): ClientMetadata | null {
  const match = issueBody.match(/<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*({[\s\S]*?})\s*-->/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as ClientMetadata;
  } catch {
    return null;
  }
}

function buildIssueBody(
  description: string,
  meta: ClientMetadata
): string {
  const metaJson = JSON.stringify(meta);

  let textOnly = description;
  let attachmentsPart = '';

  if (description.includes('### Anexos:')) {
    const parts = description.split('### Anexos:');
    textOnly = parts[0].trim();
    attachmentsPart = '### Anexos:\n' + parts[1].trim();
  }

  let body = `> 🛡️ **ReportaDesk** (Ticket gerado via Portal de Atendimento)\n`;
  body += `> 👤 **Cliente**: ${meta.clientName} (${meta.clientEmail})\n`;
  body += `> ⚡ **Prioridade**: \`${meta.priority.toUpperCase()}\` | 🏷️ **Categoria**: \`${meta.category}\`

---

${textOnly || '*(Sem descrição)*'}
`;

  if (attachmentsPart) {
    body += `\n${attachmentsPart}\n`;
  }

  body += `\n<!-- reportadesk_meta: ${metaJson} -->\n`;

  return body;
}


// Upload de anexos para o repositório GitHub como arquivos brutos (raw)
export async function uploadAttachmentToGitHub(
  fileName: string,
  base64Data: string
): Promise<string> {
  const { isConfigured, owner, repo } = getGitHubConfig();
  if (!isConfigured) return base64Data;

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) return base64Data;

  try {
    if (!base64Data.startsWith("data:image/")) {
      return base64Data;
    }

    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ext = cleanName.toLowerCase().endsWith(".png") ? ".png" : ".jpg";
    const baseNameWithoutExt = cleanName.replace(/\.(png|jpg|jpeg|gif|webp)$/i, "");
    const path = `.reportadesk/attachments/${Date.now()}_${baseNameWithoutExt}${ext}`;
    const targetBranch = "reportadesk-assets";

    // Garantir que a branch isolada para mídias (reportadesk-assets) existe no repositório
    let uploadBranch = targetBranch;
    try {
      await octokit.rest.repos.getBranch({ owner, repo, branch: targetBranch });
    } catch {
      try {
        const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });
        const defaultBranch = repoInfo.default_branch || "main";
        const { data: ref } = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${defaultBranch}` });
        await octokit.rest.git.createRef({
          owner,
          repo,
          ref: `refs/heads/${targetBranch}`,
          sha: ref.object.sha,
        });
      } catch (branchErr) {
        console.warn("Não foi possível criar branch dedicada para anexos, usando branch padrão:", branchErr);
        uploadBranch = "main";
      }
    }

    // Fazer upload do arquivo de imagem na branch de mídias (evita conflitos na branch main de dev)
    const res = await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      branch: uploadBranch,
      message: `upload attachment ${cleanName} [skip ci]`,
      content: cleanBase64,
    });

    return res.data.content?.download_url || `https://raw.githubusercontent.com/${owner}/${repo}/${uploadBranch}/${path}`;
  } catch (err) {
    console.error("Erro ao fazer upload de imagem para o repositório GitHub:", err);
    return base64Data;
  }
}

async function processBase64ImagesInText(text: string): Promise<string> {
  const base64Regex = /!\[(.*?)\]\((data:image\/[a-zA-Z]+;base64,[\s\S]+?)\)/g;
  let match;
  const replacements = [];

  while ((match = base64Regex.exec(text)) !== null) {
    const alt = match[1] || "anexo.jpg";
    const base64 = match[2];
    const uploadedUrl = await uploadAttachmentToGitHub(alt, base64);
    if (uploadedUrl && uploadedUrl !== base64) {
      replacements.push({ original: base64, url: uploadedUrl });
    }
  }

  let updatedText = text;
  for (const item of replacements) {
    updatedText = updatedText.replace(item.original, item.url);
  }

  return updatedText;
}

export async function listTickets(filterEmail?: string): Promise<Ticket[]> {
  const { isConfigured, owner, repo } = getGitHubConfig();

  if (!isConfigured) {
    // Retorna do mock local
    if (filterEmail) {
      return mockTickets.filter(t => t.clientEmail.toLowerCase() === filterEmail.toLowerCase());
    }
    return mockTickets;
  }

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) return [];

  try {
    const { data: issues } = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'all',
      sort: 'updated',
      direction: 'desc',
      per_page: 50,
    });

    const tickets: Ticket[] = [];

    for (const issue of issues) {
      // Ignorar Pull Requests retornados pela API de issues
      if (issue.pull_request) continue;

      const meta = extractMetadata(issue.body || '');

      // Status
      let status: TicketStatus = issue.state === 'closed' ? 'fechado' : 'novo';
      if (meta?.status) {
        status = meta.status;
      } else {
        const statusLabel = issue.labels.find(l => typeof l === 'object' && l.name?.startsWith('status:'));
        if (statusLabel && typeof statusLabel === 'object' && statusLabel.name) {
          status = statusLabel.name.replace('status:', '') as TicketStatus;
        }
      }

      // Prioridade
      let priority: TicketPriority = 'media';
      if (meta?.priority) {
        priority = meta.priority;
      } else {
        const prioLabel = issue.labels.find(l => typeof l === 'object' && l.name?.startsWith('prioridade:'));
        if (prioLabel && typeof prioLabel === 'object' && prioLabel.name) {
          priority = prioLabel.name.replace('prioridade:', '') as TicketPriority;
        }
      }

      // Categoria
      let category: TicketCategory = 'duvida';
      if (meta?.category) {
        category = meta.category;
      } else {
        const catLabel = issue.labels.find(l => typeof l === 'object' && l.name?.startsWith('tipo:'));
        if (catLabel && typeof catLabel === 'object' && catLabel.name) {
          category = catLabel.name.replace('tipo:', '') as TicketCategory;
        }
      }

      const clientEmail = meta?.clientEmail || issue.user?.login || 'cliente@reportadesk.com';
      const clientName = meta?.clientName || issue.user?.login || 'Cliente';

      // Se filtrou por e-mail, verificar
      if (filterEmail && clientEmail.toLowerCase() !== filterEmail.toLowerCase()) {
        continue;
      }

      // Remover bloco de cabeçalho do body para exibir limpo no portal
      const cleanBody = (issue.body || '').replace(/<!--\s*(?:reportadesk_meta|taskcloud_meta):[\s\S]*?-->/g, '').replace(/> 🛡️[\s\S]*?---\s*/m, '').trim();

      tickets.push({
        id: issue.number,
        title: issue.title,
        body: cleanBody || issue.body || '',
        status,
        priority,
        category,
        clientName,
        clientEmail,
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        commentsCount: issue.comments,
        githubUrl: issue.html_url,
      });
    }

    return tickets;
  } catch (error) {
    console.error('Erro ao listar issues do GitHub:', error);
    return mockTickets;
  }
}

export async function getTicket(issueNumber: number): Promise<Ticket | null> {
  const { isConfigured, owner, repo } = getGitHubConfig();

  if (!isConfigured) {
    const found = mockTickets.find(t => t.id === issueNumber);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) return null;

  try {
    const { data: issue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
    });

    const meta = extractMetadata(issue.body || '');
    let status: TicketStatus = issue.state === 'closed' ? 'fechado' : 'novo';
    if (meta?.status) status = meta.status;

    let priority: TicketPriority = meta?.priority || 'media';
    let category: TicketCategory = meta?.category || 'duvida';

    const cleanBody = (issue.body || '').replace(/<!--\s*(?:reportadesk_meta|taskcloud_meta):[\s\S]*?-->/g, '').replace(/> 🛡️[\s\S]*?---\s*/m, '').trim();

    const formattedComments: TicketComment[] = comments.map(c => {
      // Se tiver marcação de cliente nos metadados do comentário
      const isClientComment = c.body?.includes('<!-- reportadesk_author: client -->') || c.body?.includes('<!-- taskcloud_author: client -->');
      const authorName = isClientComment ? (meta?.clientName || 'Cliente') : (c.user?.login || 'Suporte GitHub');
      const cleanCommentBody = (c.body || '').replace(/<!--\s*(?:reportadesk_author|taskcloud_author):\s*\w+\s*-->/, '').trim();

      return {
        id: c.id,
        body: cleanCommentBody,
        authorName,
        authorAvatarUrl: c.user?.avatar_url,
        createdAt: c.created_at,
        isStaff: !isClientComment,
      };
    });

    return {
      id: issue.number,
      title: issue.title,
      body: cleanBody || issue.body || '',
      status,
      priority,
      category,
      clientName: meta?.clientName || issue.user?.login || 'Cliente',
      clientEmail: meta?.clientEmail || '',
      createdAt: issue.created_at,
      updatedAt: issue.updated_at,
      commentsCount: issue.comments,
      githubUrl: issue.html_url,
      comments: formattedComments,
    };
  } catch (error) {
    console.error(`Erro ao buscar ticket #${issueNumber} no GitHub:`, error);
    const found = mockTickets.find(t => t.id === issueNumber);
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }
}

export async function createTicket(params: {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  clientName: string;
  clientEmail: string;
}): Promise<Ticket> {
  const { isConfigured, owner, repo } = getGitHubConfig();

  const meta: ClientMetadata = {
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    category: params.category,
    priority: params.priority,
    status: 'novo',
    createdAt: new Date().toISOString(),
  };

  if (!isConfigured) {
    const newId = Math.max(...mockTickets.map(t => t.id), 100) + 1;
    const newTicket: Ticket = {
      id: newId,
      title: params.title,
      body: params.description,
      status: 'novo',
      priority: params.priority,
      category: params.category,
      clientName: params.clientName,
      clientEmail: params.clientEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      commentsCount: 0,
      githubUrl: `https://github.com/mock-repo/issues/${newId}`,
      comments: [],
    };
    mockTickets.unshift(newTicket);
    return newTicket;
  }

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) {
    throw new Error('Configurações do GitHub incompletas.');
  }

  const processedDescription = await processBase64ImagesInText(params.description);
  const fullBody = buildIssueBody(processedDescription, meta);
  const labels = [
    `status:novo`,
    `prioridade:${params.priority}`,
    `tipo:${params.category}`,
    'reportadesk'
  ];

  const { data: issue } = await octokit.rest.issues.create({
    owner,
    repo,
    title: params.title,
    body: fullBody,
    labels,
  });

  return {
    id: issue.number,
    title: issue.title,
    body: params.description,
    status: 'novo',
    priority: params.priority,
    category: params.category,
    clientName: params.clientName,
    clientEmail: params.clientEmail,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    commentsCount: 0,
    githubUrl: issue.html_url,
    comments: [],
  };
}

export async function addComment(params: {
  issueNumber: number;
  message: string;
  authorName: string;
  authorEmail: string;
  isStaff?: boolean;
}): Promise<TicketComment> {
  const { isConfigured, owner, repo } = getGitHubConfig();

  if (!isConfigured) {
    const ticket = mockTickets.find(t => t.id === params.issueNumber);
    const newComment: TicketComment = {
      id: Date.now(),
      body: params.message,
      authorName: params.authorName,
      authorEmail: params.authorEmail,
      createdAt: new Date().toISOString(),
      isStaff: Boolean(params.isStaff),
    };
    if (ticket) {
      ticket.comments = ticket.comments || [];
      ticket.comments.push(newComment);
      ticket.commentsCount = ticket.comments.length;
      ticket.updatedAt = new Date().toISOString();
      if (!params.isStaff && ticket.status === 'aguardando_cliente') {
        ticket.status = 'em_andamento';
      }
    }
    return newComment;
  }

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) {
    throw new Error('Configuração do GitHub indisponível.');
  }

  const marker = params.isStaff ? '' : '<!-- reportadesk_author: client -->\n';
  const processedMessage = await processBase64ImagesInText(params.message);
  const fullBody = `${marker}💬 **Resposta de ${params.authorName}**:\n\n${processedMessage}`;

  const { data: comment } = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: params.issueNumber,
    body: fullBody,
  });

  return {
    id: comment.id,
    body: params.message,
    authorName: params.authorName,
    authorAvatarUrl: comment.user?.avatar_url,
    createdAt: comment.created_at,
    isStaff: Boolean(params.isStaff),
  };
}

export async function updateTicketStatus(
  issueNumber: number,
  status: TicketStatus
): Promise<void> {
  const { isConfigured, owner, repo } = getGitHubConfig();

  if (!isConfigured) {
    const ticket = mockTickets.find(t => t.id === issueNumber);
    if (ticket) {
      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
    }
    return;
  }

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) return;

  const state = (status === 'resolvido' || status === 'fechado') ? 'closed' : 'open';

  await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    state,
  });
}
