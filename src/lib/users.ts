import { Octokit } from '@octokit/rest';
import { getGitHubConfig } from './github';
import { UserAccount } from './types';
import fs from 'fs';
import path from 'path';

const USERS_FILE_PATH = '.reportadesk/users.json';
const LOCAL_USERS_FILE = path.join(process.cwd(), '.reportadesk-users-cache.json');

// Usuários padrão iniciais para primeiro acesso
const DEFAULT_USERS: UserAccount[] = [
  {
    id: 'usr_admin_1',
    name: 'Equipe de Suporte 250k',
    email: 'suporte@250k.com.br',
    passwordHash: 'admin123',
    role: 'admin',
    company: '250k-dev',
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr_client_1',
    name: 'Mariana Silveira',
    email: 'mariana.silveira@acme-corp.com',
    passwordHash: '123456',
    role: 'client',
    company: 'Acme Corp',
    active: true,
    createdAt: new Date().toISOString(),
  }
];

function getOctokitClient() {
  const { token } = getGitHubConfig();
  if (!token) return null;
  return new Octokit({ auth: token });
}

export async function getUsersList(): Promise<UserAccount[]> {
  const { isConfigured, owner, repo } = getGitHubConfig();

  if (!isConfigured) {
    // Tenta carregar do arquivo local ou padrão
    if (fs.existsSync(LOCAL_USERS_FILE)) {
      try {
        const raw = fs.readFileSync(LOCAL_USERS_FILE, 'utf-8');
        return JSON.parse(raw) as UserAccount[];
      } catch {
        return DEFAULT_USERS;
      }
    }
    return DEFAULT_USERS;
  }

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) return DEFAULT_USERS;

  try {
    let data;
    try {
      const res = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: USERS_FILE_PATH,
        ref: "reportadesk-assets",
      });
      data = res.data;
    } catch {
      const res = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: USERS_FILE_PATH,
      });
      data = res.data;
    }

    if ('content' in data && typeof data.content === 'string') {
      const decodedContent = Buffer.from(data.content, 'base64').toString('utf-8');
      const users = JSON.parse(decodedContent) as UserAccount[];
      return users;
    }
    return DEFAULT_USERS;
  } catch (error: any) {
    // Se o arquivo não existir no repositório GitHub, nós inicializamos com os usuários padrão
    if (error.status === 404) {
      await saveUsersToGitHub(DEFAULT_USERS, 'Inicializar cadastro de usuários no ReportaDesk');
      return DEFAULT_USERS;
    }
    console.error('Erro ao buscar lista de usuários no GitHub:', error);
    return DEFAULT_USERS;
  }
}

async function saveUsersToGitHub(users: UserAccount[], commitMessage: string): Promise<void> {
  const { isConfigured, owner, repo } = getGitHubConfig();

  // Salva no cache local para resiliência
  try {
    fs.writeFileSync(LOCAL_USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Erro ao gravar cache local de usuários:", e);
  }

  if (!isConfigured) return;

  const octokit = getOctokitClient();
  if (!octokit || !owner || !repo) return;

  const contentBase64 = Buffer.from(JSON.stringify(users, null, 2)).toString("base64");

  try {
    const targetBranch = "reportadesk-assets";
    let sha: string | undefined = undefined;

    // Garantir que a branch dedicada existe
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
      } catch {}
    }

    try {
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: USERS_FILE_PATH,
        ref: targetBranch,
      });
      if ("sha" in data) {
        sha = data.sha;
      }
    } catch {}

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: USERS_FILE_PATH,
      branch: targetBranch,
      message: commitMessage,
      content: contentBase64,
      sha,
    });
  } catch (error) {
    console.error("Erro ao gravar usuários no GitHub:", error);
  }
}

export async function authenticateUser(email: string, password: string): Promise<UserAccount | null> {
  const users = await getUsersList();
  const normalizedEmail = email.trim().toLowerCase();
  
  const user = users.find(
    u => u.active && u.email.toLowerCase() === normalizedEmail && u.passwordHash === password.trim()
  );

  return user || null;
}

export async function createUserAccount(data: {
  name: string;
  email: string;
  passwordHash: string;
  role: 'client' | 'admin';
  company?: string;
}): Promise<UserAccount> {
  const users = await getUsersList();
  const normalizedEmail = data.email.trim().toLowerCase();

  const existing = users.find(u => u.email.toLowerCase() === normalizedEmail);
  if (existing) {
    throw new Error('Já existe um usuário cadastrado com este e-mail.');
  }

  const newUser: UserAccount = {
    id: 'usr_' + Date.now(),
    name: data.name.trim(),
    email: normalizedEmail,
    passwordHash: data.passwordHash.trim(),
    role: data.role,
    company: data.company?.trim() || (data.role === 'admin' ? '250k-dev' : 'Cliente'),
    active: true,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  await saveUsersToGitHub(users, `ReportaDesk: Novo usuário criado (${newUser.email})`);
  return newUser;
}

export async function updateUserAccount(
  id: string,
  updates: Partial<Omit<UserAccount, 'id'>>
): Promise<UserAccount> {
  const users = await getUsersList();
  const index = users.findIndex(u => u.id === id);

  if (index === -1) {
    throw new Error('Usuário não encontrado.');
  }

  const current = users[index];
  const updatedUser: UserAccount = {
    ...current,
    ...updates,
    email: updates.email ? updates.email.trim().toLowerCase() : current.email,
  };

  users[index] = updatedUser;
  await saveUsersToGitHub(users, `ReportaDesk: Usuário atualizado (${updatedUser.email})`);
  return updatedUser;
}

export async function deleteUserAccount(id: string): Promise<void> {
  let users = await getUsersList();
  const target = users.find(u => u.id === id);

  if (!target) return;

  users = users.filter(u => u.id !== id);
  await saveUsersToGitHub(users, `ReportaDesk: Usuário removido (${target.email})`);
}
