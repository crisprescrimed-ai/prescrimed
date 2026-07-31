# API local

Base local: `http://localhost:3000`.

## Health checks

| Metodo | Rota | Resposta |
| --- | --- | --- |
| `GET` | `/health` | Status simplificado da API. |
| `GET` | `/_health` | Alias de health check. |
| `GET` | `/api/health` | Health check usado pelo frontend. |
| `GET` | `/api/test` | Confirma disponibilidade e horario do servidor. |

## Autenticacao implementada

| Metodo | Rota | Corpo | Resultado |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | `{ "email", "senha" }` | Usuario e token local de desenvolvimento. |
| `POST` | `/api/auth/register` | `{ "nome", "email", "senha", "role"? }` | Cria usuario com senha bcrypt. |

`GET /api/auth/me` ainda nao esta implementada no servidor local. O frontend a utiliza para carregar o perfil depois do login; veja a limitacao no [README](../README.md#limitacao-conhecida).

## CRUD generico

Cada recurso abaixo expoe as mesmas operacoes:

| Metodo | Rota | Acao |
| --- | --- | --- |
| `GET` | `/api/{recurso}` | Lista registros por `createdAt` decrescente. |
| `GET` | `/api/{recurso}/:id` | Busca um registro. |
| `POST` | `/api/{recurso}` | Cria com o corpo JSON recebido. |
| `PUT` | `/api/{recurso}/:id` | Atualiza com o corpo JSON recebido. |
| `DELETE` | `/api/{recurso}/:id` | Exclui o registro. |

Recursos registrados:

```text
empresas
usuarios
pacientes
prescricoes
agendamentos
registro-enfermagem
sessoes-fisio
casa-repouso-leitos
pets
estoque-itens
estoque-movimentacoes
financeiro-transacoes
catalogo-items
pedidos
pedido-items
pagamentos
nota-fiscal
nota-fiscal-logs
empresa-sequencias
```

Tambem existe `GET /api/empresas/me`, que retorna a empresa criada primeiro.

## Respostas de erro

Erros da API usam o formato:

```json
{
  "error": "Mensagem legivel",
  "details": "Detalhe tecnico quando disponivel"
}
```

## Observacoes de seguranca

Esta API local foi projetada para desenvolvimento. Ela usa CORS aberto e as rotas CRUD genericas ainda nao aplicam verificacao de token, filtro por empresa ou validacao de campos no servidor. Antes de expor a API publicamente, adicione autenticacao de middleware, autorizacao por empresa, validacao de entrada, rate limiting e uma politica CORS restritiva.
