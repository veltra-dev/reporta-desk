import { uploadBase64ToSupabase } from './supabase';
import { Octokit } from '@octokit/rest';
import { Ticket, TicketComment, TicketPriority, TicketStatus, TicketCategory, ClientMetadata } from './types';

// Mock data em memória para visualização instantânea antes de configurar as chaves
let mockTickets: Ticket[] = [];

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


function parseTicketStatus(
  issueState: string,
  issueLabels: any[] = [],
  metaStatus?: TicketStatus
): TicketStatus {
  const statusLabelObj = issueLabels.find(l => 
    (typeof l === 'object' && l.name?.startsWith('status:')) ||
    (typeof l === 'string' && l.startsWith('status:'))
  );
  
  const statusFromLabel = statusLabelObj
    ? ((typeof statusLabelObj === 'object' ? statusLabelObj.name : statusLabelObj).replace('status:', '') as TicketStatus)
    : null;

  let status: TicketStatus = statusFromLabel || metaStatus || (issueState === 'closed' ? 'fechado' : 'novo');

  if (issueState === 'closed') {
    if (status !== 'resolvido' && status !== 'fechado') {
      status = 'resolvido';
    }
  } else if (issueState === 'open') {
    if (status === 'fechado' || status === 'resolvido') {
      status = 'em_andamento';
    }
  }

  return status;
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
  try {
    const supabaseUrl = await uploadBase64ToSupabase(base64Data, fileName);
    if (supabaseUrl) {
      return supabaseUrl;
    }
  } catch (err) {
    console.warn("Supabase Storage fallback for upload:", err);
  }

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
  const base64Regex = /(!)?\[(.*?)\]\((data:(?:image|video|application)\/(?:[a-zA-Z0-9+.-]+);base64,[\s\S]+?)\)/g;
  let match;
  const replacements: Array<{ original: string; replacement: string }> = [];

  while ((match = base64Regex.exec(text)) !== null) {
    const alt = match[2] || "anexo";
    const base64 = match[3];
    const isVideoOrDoc = base64.startsWith("data:video/") || base64.startsWith("data:application/") || alt.endsWith(".mp4") || alt.endsWith(".webm") || alt.endsWith(".pdf");

    try {
      const uploadedUrl = await uploadAttachmentToGitHub(alt, base64);
      if (uploadedUrl && uploadedUrl !== base64) {
        const downloadUrl = (uploadedUrl.includes('supabase.co') && !uploadedUrl.includes('?download='))
          ? `${uploadedUrl}?download=${encodeURIComponent(alt)}`
          : uploadedUrl;

        const tag = isVideoOrDoc
          ? `[🎥 Assistir/Baixar Vídeo: ${alt}](${downloadUrl})`
          : `![${alt}](${uploadedUrl})`;

        replacements.push({ original: match[0], replacement: tag });
      } else if (base64.length > 5000) {
        replacements.push({ original: match[0], replacement: `[Anexo grande: ${alt}]` });
      }
    } catch (err) {
      console.warn("Erro ao processar anexo base64:", err);
      if (base64.length > 5000) {
        replacements.push({ original: match[0], replacement: `[Anexo grande: ${alt}]` });
      }
    }
  }

  let updatedText = text;
  for (const item of replacements) {
    updatedText = updatedText.replace(item.original, item.replacement);
  }

  if (updatedText.length > 60000) {
    updatedText = updatedText.substring(0, 60000) + "\n\n*(Conteúdo resumido por exceder o limite do GitHub)*";
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

      // Filtrar apenas chamados do ReportaDesk (com label 'reportadesk' ou metadados de cliente)
      const hasReportadeskLabel = issue.labels?.some(l => 
        (typeof l === 'string' && l === 'reportadesk') ||
        (typeof l === 'object' && l.name === 'reportadesk')
      );
      const isReportaDeskIssue = hasReportadeskLabel || Boolean(meta);

      if (!isReportaDeskIssue) {
        continue; // Ignora issues internas do repositório dev
      }

      // Status
      const status = parseTicketStatus(issue.state, issue.labels, meta?.status);

      // Prioridade
      let priority: TicketPriority = 'media';
      if (meta?.priority) {
        priority = meta.priority;
      } else {
        const prioLabel = issue.labels.find(l => {
          const name = typeof l === 'object' ? l.name : l;
          return name?.startsWith('priority:') || name?.startsWith('prioridade:');
        });
        if (prioLabel) {
          const name = typeof prioLabel === 'object' ? (prioLabel.name || '') : (prioLabel as string);
          priority = name.replace(/^priority:|^prioridade:/, '') as TicketPriority;
        }
      }

      // Categoria
      let category: TicketCategory = 'duvida';
      if (meta?.category) {
        category = meta.category;
      } else {
        const catLabel = issue.labels.find(l => {
          const name = typeof l === 'object' ? l.name : l;
          return name?.startsWith('type:') || name?.startsWith('tipo:');
        });
        if (catLabel) {
          const name = typeof catLabel === 'object' ? (catLabel.name || '') : (catLabel as string);
          category = name.replace(/^type:|^tipo:/, '') as TicketCategory;
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
    const status = parseTicketStatus(issue.state, issue.labels, meta?.status);

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

    const linkedTicketsIds = meta?.linkedTickets || [];
    const linkedTicketsDetails: { id: number; title: string; status: TicketStatus }[] = [];

    if (linkedTicketsIds.length > 0) {
      for (const linkedId of linkedTicketsIds) {
        try {
          const { data: linkedIssue } = await octokit.rest.issues.get({
            owner,
            repo,
            issue_number: linkedId,
          });
          const linkedMeta = extractMetadata(linkedIssue.body || '');
          const linkedStatus = parseTicketStatus(linkedIssue.state, linkedIssue.labels, linkedMeta?.status);
          linkedTicketsDetails.push({
            id: linkedIssue.number,
            title: linkedIssue.title,
            status: linkedStatus,
          });
        } catch {
          // Ignorar se issue vinculada não for encontrada
        }
      }
    }

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
      participants: meta?.participants || [],
      linkedTickets: linkedTicketsIds,
      linkedTicketsDetails,
    };
  } catch (error: any) {
    if (error?.status === 410 || error?.status === 404) {
      console.log(`[GitHub API] Chamado #${issueNumber} foi excluído ou não existe no GitHub (status ${error?.status}).`);
      return null;
    }
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
    `priority:${params.priority}`,
    `type:${params.category}`,
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

  try {
    const { data: currentIssue } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    });

    let currentBody = currentIssue.body || "";
    let meta = extractMetadata(currentBody) || {
      clientName: currentIssue.user?.login || "Cliente",
      clientEmail: "",
      category: "duvida",
      priority: "media",
      status,
      createdAt: new Date().toISOString(),
      participants: [],
    };

    meta.status = status;
    const metaJson = JSON.stringify(meta);

    let newBody = currentBody;
    if (/<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/.test(currentBody)) {
      newBody = currentBody.replace(
        /<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/,
        `<!-- reportadesk_meta: ${metaJson} -->`
      );
    } else {
      newBody = `${currentBody}\n\n<!-- reportadesk_meta: ${metaJson} -->\n`;
    }

    const existingLabels = (currentIssue.labels || []).map((l: any) =>
      typeof l === 'string' ? l : l.name || ''
    );
    const cleanLabels = existingLabels.filter((l: string) => !l.startsWith('status:'));
    cleanLabels.push(`status:${status}`);

    await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      state,
      body: newBody,
      labels: cleanLabels,
    });
  } catch (error) {
    console.error(`Erro ao atualizar status do ticket #${issueNumber} no GitHub:`, error);
  }
}


export async function addParticipantToTicket(
  issueNumber: number,
  email: string
): Promise<void> {
  const { isConfigured, owner, repo } = getGitHubConfig();

  if (!isConfigured) {
    const ticket = mockTickets.find(t => t.id === issueNumber);
    if (ticket) {
      ticket.participants = ticket.participants || [];
      if (!ticket.participants.includes(email)) {
        ticket.participants.push(email);
      }
    }
    return;
  }

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) return;

  const { data: currentIssue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  let currentBody = currentIssue.body || "";
  let meta = extractMetadata(currentBody) || {
    clientName: currentIssue.user?.login || "Cliente",
    clientEmail: "",
    category: "duvida",
    priority: "media",
    status: "novo",
    createdAt: new Date().toISOString(),
    participants: [],
  };

  meta.participants = meta.participants || [];
  if (!meta.participants.includes(email)) {
    meta.participants.push(email);
  }

  const metaJson = JSON.stringify(meta);
  let newBody = currentBody;
  if (/<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/.test(currentBody)) {
    newBody = currentBody.replace(
      /<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/,
      `<!-- reportadesk_meta: ${metaJson} -->`
    );
  } else {
    newBody = `${currentBody}\n\n<!-- reportadesk_meta: ${metaJson} -->\n`;
  }

  await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    body: newBody,
  });
}

export async function removeParticipantFromTicket(
  issueNumber: number,
  email: string
): Promise<void> {
  const { isConfigured, owner, repo } = getGitHubConfig();

  if (!isConfigured) {
    const ticket = mockTickets.find(t => t.id === issueNumber);
    if (ticket && ticket.participants) {
      ticket.participants = ticket.participants.filter(p => p !== email);
    }
    return;
  }

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) return;

  const { data: currentIssue } = await octokit.rest.issues.get({
    owner,
    repo,
    issue_number: issueNumber,
  });

  let currentBody = currentIssue.body || "";
  let meta = extractMetadata(currentBody);
  if (!meta || !meta.participants) return;

  meta.participants = meta.participants.filter(p => p !== email);
  const metaJson = JSON.stringify(meta);

  let newBody = currentBody.replace(
    /<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/,
    `<!-- reportadesk_meta: ${metaJson} -->`
  );

  await octokit.rest.issues.update({
    owner,
    repo,
    issue_number: issueNumber,
    body: newBody,
  });
}

export async function linkTickets(
  issueNumberA: number,
  issueNumberB: number
): Promise<{ success: boolean; error?: string }> {
  if (issueNumberA === issueNumberB) {
    return { success: false, error: 'Não é possível vincular um chamado a ele mesmo.' };
  }

  const { isConfigured, owner, repo } = getGitHubConfig();

  if (!isConfigured) {
    const ticketA = mockTickets.find(t => t.id === issueNumberA);
    const ticketB = mockTickets.find(t => t.id === issueNumberB);

    if (!ticketA || !ticketB) {
      return { success: false, error: `Chamado #${!ticketA ? issueNumberA : issueNumberB} não foi encontrado.` };
    }

    ticketA.linkedTickets = ticketA.linkedTickets || [];
    if (!ticketA.linkedTickets.includes(issueNumberB)) {
      ticketA.linkedTickets.push(issueNumberB);
    }

    ticketB.linkedTickets = ticketB.linkedTickets || [];
    if (!ticketB.linkedTickets.includes(issueNumberA)) {
      ticketB.linkedTickets.push(issueNumberA);
    }

    return { success: true };
  }

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) {
    return { success: false, error: 'Configuração do GitHub indisponível.' };
  }

  try {
    const [resA, resB] = await Promise.all([
      octokit.rest.issues.get({ owner, repo, issue_number: issueNumberA }).catch(() => null),
      octokit.rest.issues.get({ owner, repo, issue_number: issueNumberB }).catch(() => null),
    ]);

    if (!resA || !resB) {
      const missingId = !resA ? issueNumberA : issueNumberB;
      return { success: false, error: `Chamado #${missingId} não existe no GitHub.` };
    }

    const issueA = resA.data;
    const issueB = resB.data;

    // Atualizar Issue A
    let bodyA = issueA.body || "";
    let metaA = extractMetadata(bodyA) || {
      clientName: issueA.user?.login || "Cliente",
      clientEmail: "",
      category: "duvida",
      priority: "media",
      status: "novo",
      createdAt: new Date().toISOString(),
      participants: [],
      linkedTickets: [],
    };
    metaA.linkedTickets = metaA.linkedTickets || [];
    if (!metaA.linkedTickets.includes(issueNumberB)) {
      metaA.linkedTickets.push(issueNumberB);
    }
    const metaAJson = JSON.stringify(metaA);
    let newBodyA = bodyA;
    if (/<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/.test(bodyA)) {
      newBodyA = bodyA.replace(
        /<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/,
        `<!-- reportadesk_meta: ${metaAJson} -->`
      );
    } else {
      newBodyA = `${bodyA}\n\n<!-- reportadesk_meta: ${metaAJson} -->\n`;
    }

    // Atualizar Issue B
    let bodyB = issueB.body || "";
    let metaB = extractMetadata(bodyB) || {
      clientName: issueB.user?.login || "Cliente",
      clientEmail: "",
      category: "duvida",
      priority: "media",
      status: "novo",
      createdAt: new Date().toISOString(),
      participants: [],
      linkedTickets: [],
    };
    metaB.linkedTickets = metaB.linkedTickets || [];
    if (!metaB.linkedTickets.includes(issueNumberA)) {
      metaB.linkedTickets.push(issueNumberA);
    }
    const metaBJson = JSON.stringify(metaB);
    let newBodyB = bodyB;
    if (/<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/.test(bodyB)) {
      newBodyB = bodyB.replace(
        /<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/,
        `<!-- reportadesk_meta: ${metaBJson} -->`
      );
    } else {
      newBodyB = `${bodyB}\n\n<!-- reportadesk_meta: ${metaBJson} -->\n`;
    }

    await Promise.all([
      octokit.rest.issues.update({ owner, repo, issue_number: issueNumberA, body: newBodyA }),
      octokit.rest.issues.update({ owner, repo, issue_number: issueNumberB, body: newBodyB }),
    ]);

    // Comentar no GitHub mencionando a outra issue (#123) para vincular nativamente no GitHub
    await Promise.all([
      octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumberA,
        body: `🔗 **Chamado vinculado ao chamado #${issueNumberB}** (${issueB.title})`,
      }).catch(() => null),
      octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: issueNumberB,
        body: `🔗 **Chamado vinculado ao chamado #${issueNumberA}** (${issueA.title})`,
      }).catch(() => null),
    ]);

    return { success: true };
  } catch (error: any) {
    console.error(`Erro ao vincular chamados #${issueNumberA} e #${issueNumberB}:`, error);
    return { success: false, error: 'Erro ao vincular chamados no GitHub.' };
  }
}

export async function unlinkTickets(
  issueNumberA: number,
  issueNumberB: number
): Promise<{ success: boolean; error?: string }> {
  const { isConfigured, owner, repo } = getGitHubConfig();

  if (!isConfigured) {
    const ticketA = mockTickets.find(t => t.id === issueNumberA);
    const ticketB = mockTickets.find(t => t.id === issueNumberB);
    if (ticketA && ticketA.linkedTickets) {
      ticketA.linkedTickets = ticketA.linkedTickets.filter(id => id !== issueNumberB);
    }
    if (ticketB && ticketB.linkedTickets) {
      ticketB.linkedTickets = ticketB.linkedTickets.filter(id => id !== issueNumberA);
    }
    return { success: true };
  }

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) {
    return { success: false, error: 'Configuração do GitHub indisponível.' };
  }

  try {
    const [resA, resB] = await Promise.all([
      octokit.rest.issues.get({ owner, repo, issue_number: issueNumberA }).catch(() => null),
      octokit.rest.issues.get({ owner, repo, issue_number: issueNumberB }).catch(() => null),
    ]);

    if (resA) {
      const issueA = resA.data;
      let bodyA = issueA.body || "";
      let metaA = extractMetadata(bodyA);
      if (metaA && metaA.linkedTickets) {
        metaA.linkedTickets = metaA.linkedTickets.filter(id => id !== issueNumberB);
        const metaAJson = JSON.stringify(metaA);
        let newBodyA = bodyA.replace(
          /<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/,
          `<!-- reportadesk_meta: ${metaAJson} -->`
        );
        await octokit.rest.issues.update({ owner, repo, issue_number: issueNumberA, body: newBodyA });
      }
    }

    if (resB) {
      const issueB = resB.data;
      let bodyB = issueB.body || "";
      let metaB = extractMetadata(bodyB);
      if (metaB && metaB.linkedTickets) {
        metaB.linkedTickets = metaB.linkedTickets.filter(id => id !== issueNumberA);
        const metaBJson = JSON.stringify(metaB);
        let newBodyB = bodyB.replace(
          /<!--\s*(?:reportadesk_meta|taskcloud_meta):\s*{[\s\S]*?}\s*-->/,
          `<!-- reportadesk_meta: ${metaBJson} -->`
        );
        await octokit.rest.issues.update({ owner, repo, issue_number: issueNumberB, body: newBodyB });
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`Erro ao desvincular chamados #${issueNumberA} e #${issueNumberB}:`, error);
    return { success: false, error: 'Erro ao desvincular chamados no GitHub.' };
  }
}
