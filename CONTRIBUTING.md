# 🤝 Contribuindo para o PANIDESK

> 💻 **O Desktop Remoto que é PANO pra MAMÃO!** ⚡
> 
> Obrigado por considerar contribuir pro projeto mais irado da internet! 🚀

Obrigado por considerar contribuir para o Remote Desktop App! Este documento fornece diretrizes e instruções para contribuições.

## 📋 Índice

- [Código de Conduta](#código-de-conduta)
- [Como Contribuir](#como-contribuir)
- [Reportando Bugs](#reportando-bugs)
- [Sugerindo Melhorias](#sugerindo-melhorias)
- [Pull Requests](#pull-requests)
- [Estilo de Código](#estilo-de-código)
- [Commits](#commits)
- [Branches](#branches)

## 🤝 Código de Conduta

Este projeto adota o [Código de Conduta do Contributor Covenant](https://www.contributor-covenant.org/pt-br/version/2/1/code_of_conduct/). Ao participar, esperamos que todos sigam estas regras.

## 🚀 Como Contribuir

### 1. Reportando Bugs

Antes de criar uma issue de bug:

- Verifique se o bug já foi reportado nas [issues](https://github.com/SeuUsuario/remote-desktop-app/issues)
- Use a última versão para verificar se o bug ainda existe

#### Template de Bug

```markdown
**Descrição do Bug**
Uma descrição clara e concisa do bug.

**Para Reproduzir**
1. Vá para '...'
2. Clique em '....'
3. Role para baixo até '....'
4. Veja o erro

**Comportamento Esperado**
Uma descrição clara do que deveria acontecer.

**Screenshots**
Se aplicável, adicione screenshots para ajudar a explicar o problema.

**Desktop (por favor complete as seguintes informações):**
- OS: [ex: Windows 10, macOS 12, Ubuntu 20.04]
- Versão do App: [ex: 1.0.0]
- Node.js: [ex: 16.14.0]

**Contexto Adicional**
Adicione qualquer outro contexto sobre o problema aqui.
```

### 2. Sugerindo Melhorias

Melhorias são rastreadas como GitHub issues. Crie uma issue usando:

- **Título descritivo** - Ex: "Adicionar suporte para múltiplos monitores"
- **Template de melhoria** - Use a label "enhancement"

#### Template de Melhoria

```markdown
**Sua sugestão de melhoria**
Uma descrição clara e concisa do que você gostaria de acontecer.

**Descreva a solução que você gostaria**
Uma descrição clara do que você quer que aconteça.

**Descreva alternativas que você considerou**
Uma descrição clara de qualquer solução alternativa ou funcionalidades que você considerou.

**Contexto Adicional**
Adicione qualquer outro contexto ou screenshots sobre a sugestão de melhoria aqui.
```

### 3. Pull Requests

#### Processo

1. **Fork** o repositório
2. **Clone** seu fork: `git clone https://github.com/seu-usuario/remote-desktop-app.git`
3. **Crie uma branch** para sua feature: `git checkout -b feature/AmazingFeature`
4. **Commit** suas mudanças: `git commit -m 'Add some AmazingFeature'`
5. **Push** para a branch: `git push origin feature/AmazingFeature`
6. **Abra um Pull Request**

#### Template de Pull Request

```markdown
## Descrição
Uma descrição clara do que este PR faz.

## Tipo de Mudança
- [ ] Bug fix (mudança que corrige um problema)
- [ ] New feature (mudança que adiciona funcionalidade)
- [ ] Breaking change (mudança que quebra compatibilidade)
- [ ] Documentação

## Como Testar
Descreva como testar as mudanças.

## Screenshots
Se aplicável, adicione screenshots.

## Checklist
- [ ] Meu código segue o estilo do projeto
- [ ] Eu realizei uma auto-revisão
- [ ] Eu comentei meu código em áreas complexas
- [ ] Eu atualizei a documentação
- [ ] Meus commits seguem as convenções
```

## 💻 Estilo de Código

### JavaScript

```javascript
// ✅ Bom
function calculateDistance(x1, y1, x2, y2) {
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
    return Math.sqrt(deltaX ** 2 + deltaY ** 2);
}

// ❌ Ruim
function calc(x1,y1,x2,y2){
return Math.sqrt((x2-x1)**2+(y2-y1)**2)
}
```

### Regras

- Use **camelCase** para variáveis e funções
- Use **PascalCase** para classes
- Use **UPPER_SNAKE_CASE** para constantes
- Use **2 espaços** para indentação
- Use **aspas simples** para strings
- Adicione **ponto e vírgula** no final das declarações

### CSS

```css
/* ✅ Bom */
.button {
  background-color: #007bff;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
}

/* ❌ Ruim */
.button{background:#007bff;border:none;padding:10px 20px;font-size:16px}
```

### Regras

- Use **kebab-case** para nomes de classes
- Use **2 espaços** para indentação
- Adicione **espaço** após `: ` em propriedades
- Use **ordem alfabética** para propriedades

## 📝 Commits

### Convenção de Commits

Seguimos a [Convenção de Commits Convencional](https://www.conventionalcommits.org/pt-br/v1.0.0/):

```
<tipo>(<escopo>): <assunto>

<corpo>

<rodapé>
```

### Tipos

- **feat**: Nova funcionalidade
- **fix**: Correção de bug
- **docs**: Documentação
- **style**: Formatação (sem mudança de código)
- **refactor**: Refatoração de código
- **perf**: Melhorias de performance
- **test**: Adição ou modificação de testes
- **chore**: Mudanças no processo de build ou ferramentas auxiliares

### Exemplos

```bash
# ✅ Bom
feat(remote-control): add multi-monitor support

Added support for controlling multiple monitors
- Detect connected displays
- Switch between monitors
- Fullscreen on specific monitor

Closes #123

# ❌ Ruim
added stuff
```

## 🌿 Branches

### Nomenclatura

- `feature/nova-funcionalidade` - Novas features
- `bugfix/corrigir-bug` - Correções de bugs
- `hotfix/correcao-urgente` - Correções urgentes em produção
- `docs/atualizar-readme` - Atualizações de documentação
- `refactor/melhorar-performance` - Refatorações

### Estrutura

```
main
├── develop
│   ├── feature/remote-audio
│   ├── feature/file-transfer-enhancement
│   └── bugfix/connection-timeout
├── hotfix/security-patch
└── docs/update-readme
```

## 🧪 Testes

### Executando Testes

```bash
# Testes unitários
npm test

# Testes com cobertura
npm run test:coverage

# Testes E2E
npm run test:e2e
```

### Escrevendo Testes

```javascript
// Exemplo de teste unitário
describe('RemoteControl', () => {
  it('should start remote session', () => {
    const remoteControl = new RemoteControl();
    remoteControl.start();
    expect(remoteControl.isActive).toBe(true);
  });
});
```

## 📚 Documentação

### Atualizando Documentação

- **README.md**: Visão geral e instruções
- **docs/**: Documentação detalhada
- **inline comments**: Comentários no código

### Idioma

- **Português**: Para documentação geral e comentários
- **Inglês**: Para nomes de variáveis, funções e commits

## 🎨 Design

### Princípios de UI/UX

1. **Clareza**: Interface intuitiva e autoexplicativa
2. **Consistência**: Padrões uniformes em todo o aplicativo
3. **Feedback**: Resposta visual para todas as ações
4. **Acessibilidade**: Suporte para leitores de tela e navegação por teclado

### Cores

```css
:root {
  --primary-color: #2563eb;      /* Azul principal */
  --success-color: #10b981;      /* Verde sucesso */
  --danger-color: #ef4444;       /* Vermelho erro */
  --warning-color: #f59e0b;      /* Laranja aviso */
  --text-primary: #1e293b;       /* Texto principal */
  --text-secondary: #64748b;     /* Texto secundário */
}
```

## 🚀 Performance

### Diretrizes

- **Lazy loading** para componentes pesados
- **Debouncing** para eventos frequentes
- **Comprimir imagens** e assets
- **Minificar** código em produção
- **Cache** onde apropriado

### Ferramentas

- **Chrome DevTools**: Para profiling
- **Lighthouse**: Para auditoria de performance
- **Webpack Bundle Analyzer**: Para análise de bundles

## 🔍 Debug

### Logs

```javascript
// ✅ Bom
console.log('[RemoteControl] Starting remote session:', { clientId, quality });

// ❌ Ruim
console.log('start');
```

### Níveis de Log

- **DEBUG**: Informações detalhadas para desenvolvimento
- **INFO**: Informações gerais de operação
- **WARN**: Avisos sobre comportamentos inesperados
- **ERROR**: Erros que não impedem a operação
- **FATAL**: Erros críticos que impedem a operação

## 📞 Contato

Se tiver dúvidas sobre como contribuir:

- **Issues**: Crie uma issue com a label "question"
- **Email**: dev@remotedesktopapp.com
- **Discord**: [Link do Discord](https://discord.gg/xxx)

---

Obrigado por contribuir! 🎉