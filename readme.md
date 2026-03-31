# 🥩 Fator de Corte — Documentação Técnica

## 📜 Visão Geral

Aplicação web progressiva (PWA) para cálculo de rendimento e formação de preço em açougues e frigoríficos. O sistema distribui o custo da carcaça entre os cortes considerando fator de escassez, quebra e desperdício, permitindo ao açougueiro definir preços de venda com margem real de lucro garantida.

**Características principais:**
* Cálculo do fator de rendimento (FR) e fator de custo (FC) por corte
* Distribuição de custo por escassez ou igualitária
* Dois modos de precificação: Margem sobre venda e Markup sobre custo
* Suporte a subprodutos com tratamento diferenciado no rateio
* Alerta automático de quebra excessiva (>22%)
* Interface responsiva com tema escuro premium
* Funcionamento offline via Service Worker (PWA instalável)

---

## ✔️ Acesso Imediato

A solução está publicada no GitHub Pages — sem instalação ou dependências.

**[https://maurilio-carmo.github.io/Fator-Corte/](https://maurilio-carmo.github.io/Fator-Corte/)**

Toda a operação é executada no front-end (client-side).

---

## ⚙️ Requisitos Técnicos

* **Navegadores:** Chrome 90+, Edge 90+, Firefox 88+
* **Tecnologias:** HTML5, CSS3, JavaScript ES6+ (Modules), Service Worker
* **Arquitetura:** Client-side (sem backend)
* **APIs Externas:** Nenhuma

---

## 🏗️ Arquitetura do Projeto

### Estrutura de Diretórios

```
├── components/          # Componentes HTML modulares
├── css/
│   ├── index.css       # Ponto de entrada — importa todos os CSS
│   ├── base.css        # Variáveis, reset e tipografia
│   ├── layout.css      # Grid, containers e estrutura de página
│   ├── components.css  # Cards, botões, formulários e tabela
│   └── theme.css       # Paleta de cores, animações e responsividade
├── data/
│   └── cuts.json       # Cortes predefinidos por tipo de carcaça
├── icons/              # Ícone SVG do app
├── src/
│   ├── app.js          # Bootstrap e inicialização
│   ├── controllers/    # Gerenciamento de estado (MVC)
│   ├── models/         # Modelos de dados (Carcaça e Corte)
│   ├── services/       # Motor de cálculo
│   ├── views/          # Renderização de interface (MVC)
│   └── utils/          # Formatadores de valores
├── manifest.json       # Manifesto PWA
└── sw.js               # Service Worker (cache offline)
```

### Padrões Arquiteturais

* **MVC Adaptado:** Separação clara entre models, views, controller e service
* **ES Modules:** Carregamento modular nativo sem bundler
* **Event-Driven:** Atualizações reativas a cada entrada do usuário
* **Component-Based:** Componentes HTML carregados via `fetch` no bootstrap
* **PWA:** Cache-first com Service Worker para uso offline

---

## 🔧 Funcionalidades Principais

### 1. Configuração da Carcaça

**Inputs:**
* Tipo de carcaça (Traseiro, Dianteiro, Ponta-de-Agulha, Suínos)
* Peso total (kg)
* Preço de compra por kg (R$/kg)
* Margem alvo (%)

**Comportamento:**
* Seleção do tipo carrega automaticamente os cortes padrão
* Custo total da carcaça calculado em tempo real

### 2. Gestão de Cortes

* Listagem dinâmica com adição e remoção de cortes
* Autocomplete com sugestões baseadas no tipo de carcaça
* Campo de peso (kg) e preço de venda (R$/kg) por corte
* Flag de subproduto: cortes marcados saem do rateio de escassez
* Botão de alternância global para marcar/desmarcar todos como subproduto

### 3. Modos de Precificação

| Modo | Fórmula | Uso Recomendado |
|------|---------|-----------------|
| **Margem** | `(Receita - Custo) / Receita` | Varejo — controle sobre faturamento |
| **Markup** | `(Receita - Custo) / Custo` | Atacado — controle sobre custo |

### 4. Modos de Distribuição de Custo

| Modo | Lógica | Efeito |
|------|--------|--------|
| **Escassez** | `FC_esc = FR_médio / FR_individual` | Cortes mais escassos (menor FR) recebem custo maior |
| **Igualitário** | `FC_esc = 1` para todos | Custo da quebra distribuído igualmente por kg |

### 5. Painel de Resumo

* Total de peso em cortes e percentual de quebra/desperdício
* Custo total da carcaça
* Receita total + lucro líquido
* Margem média com indicador visual de status

### 6. Tabela de Resultados

* Fator de Rendimento (FR) por corte
* Fator de Custo (FC) calculado
* Custo real por kg (R$/kg)
* Custo proporcional ao peso
* Receita bruta do corte
* Margem/Markup efetivo com badge colorido
* Preço mínimo para atingir a meta
* Diferença entre preço praticado e mínimo (+/-)

---

## 📊 Fluxo de Cálculos

### Ordem de Processamento

```
1. Entrada de Dados (Carcaça + Cortes)
   ↓
2. Cálculo de Quebra
   Quebra = Peso carcaça − Σ peso dos cortes
   ↓
3. Cálculo do FR por Corte
   FR = Peso do corte / Peso da carcaça
   ↓
4. Cálculo do FC por Corte
   FC_escassez = FR_médio / FR_individual  (modo Escassez)
   FC_quebra   = Peso quebra / Σ peso cortes
   FC_total    = FC_escassez + FC_quebra
   ↓
5. Custo Real por kg
   Custo_real = Preço_compra × FC_total
   ↓
6. Cálculo de Margem ou Markup
   Margem  = (Receita − Custo) / Receita
   Markup  = (Receita − Custo) / Custo
   ↓
7. Preço Mínimo para Meta
   P_min (Margem) = Custo_real / (1 − Margem_alvo)
   P_min (Markup) = Custo_real × (1 + Markup_alvo)
   ↓
8. Atualização da Interface
```

### Exemplo Prático

| Parâmetro | Valor |
|-----------|-------|
| Carcaça | 24 kg @ R$ 15,00/kg = R$ 360,00 |
| Filé Mignon | 3 kg @ R$ 60,00/kg |
| Quebra | 2 kg (8,33%) |
| FR_médio | 20% · FR_filé = 12,5% |
| FC_escassez | 20 / 12,5 = **1,600** |
| FC_quebra | 2 / 22 = **0,091** |
| Custo real/kg | 15 × 1,691 = **R$ 25,36** |
| Margem efetiva | (180 − 76,09) / 180 = **57,7%** |

### Módulos de Cálculo

* **`CalculationService.js`:** Motor central — todos os cálculos matemáticos
* **`AppController.js`:** Orquestração, estado e persistência
* **`AppView.js`:** Renderização e atualização do DOM
* **`Carcass.js` / `Cut.js`:** Modelos de dados com propriedades computadas

---

## 🎨 Sistema de Design

### Paleta de Cores

* **Fundo principal:** `#1a0f08` (marrom escuro profundo)
* **Acento primário:** `#c17f24` (âmbar dourado)
* **Superfícies:** Escala de tons terrosos
* **Status:** Verde (≥30%), Amarelo (≥20%), Vermelho (<20%)

### Componentes Visuais

* **Summary Cards:** 4 cards com métricas principais do resumo
* **Tabela de Resultados:** Linhas coloridas com badges de margem
* **Barra de Quebra:** Indicador visual percentual no card de totais
* **Alerta de Quebra:** Banner destacado com animação shake (quebra >22%)
* **Badges de Status:** Labels coloridos — Verde / Amarelo / Vermelho
* **Botões:** Primário, secundário, ghost e danger com estados hover/focus

---

## 💾 Persistência de Dados

### LocalStorage

**Chaves utilizadas:**

| Chave | Conteúdo |
|-------|---------|
| `fc_settings` | Preferências de modo (priceMode, costMode) |

**Comportamento:**
* Configurações salvas automaticamente a cada alteração
* Restauradas na inicialização do app
* Cortes e valores NÃO são persistidos entre sessões

---

## 📱 Responsividade

### Breakpoints

* **Desktop:** > 900px (layout 2 colunas — formulário + resumo)
* **Tablet:** 481–900px (layout 1 coluna empilhado)
* **Mobile:** ≤ 480px (otimizado para toque, inputs ampliados)

### Adaptações Mobile

* Grid de cortes em coluna única
* Tabela com scroll horizontal
* Botões com área de toque ampliada
* Cards de resumo em coluna única

---

## 🔌 PWA — Progressive Web App

### Service Worker (`sw.js`)

* **Estratégia:** Cache-first para todos os assets estáticos
* **Pré-cache:** 40+ arquivos cacheados na instalação
* **Atualização:** Novo `CACHE_VERSION` descarta cache anterior automaticamente
* **Offline:** Funciona completamente sem conexão após primeira visita

### Manifesto (`manifest.json`)

```json
{
  "name": "Fator de Corte",
  "short_name": "Fator Corte",
  "display": "standalone",
  "theme_color": "#c17f24",
  "background_color": "#1a0f08",
  "categories": ["business", "utilities"]
}
```

**Instalação:** Disponível via botão "Instalar app" nos navegadores compatíveis (Chrome, Edge).

---

## 🔒 Segurança e Validação

* **Inputs Numéricos:** Constraints de min/max nos campos
* **XSS:** Valores de usuário inseridos exclusivamente via `textContent` (nunca `innerHTML`)
* **Validação de Cortes:** Apenas cortes com peso > 0 entram nos cálculos
* **Dados Isolados:** Nenhum dado enviado a servidores externos

---

## 🚀 Como Utilizar

### Fluxo Básico

1. **Selecionar tipo de carcaça**
   * Traseiro, Dianteiro, Ponta-de-Agulha ou Suínos
   * Cortes padrão são carregados automaticamente

2. **Preencher dados da carcaça**
   * Peso total comprado (kg)
   * Preço de compra por kg (R$/kg)
   * Margem alvo desejada (%)

3. **Configurar cortes**
   * Ajustar nome, peso e preço de venda de cada corte
   * Adicionar ou remover cortes conforme necessário
   * Marcar subprodutos (miúdos, ossos) quando aplicável

4. **Ajustar configurações (opcional)**
   * Modo de preço: Margem ou Markup
   * Modo de custo: Escassez ou Igualitário

5. **Analisar resultados**
   * Verificar cards de resumo para visão geral
   * Consultar tabela para detalhes por corte
   * Ajustar preços com base no preço mínimo sugerido

### Atalhos e Dicas

* **ESC:** Fecha o painel de configurações
* **Alerta amarelo:** Quebra entre 15–22% — atenção ao desperdício
* **Alerta vermelho:** Quebra >22% — revisar pesagens
* **Badge vermelho na tabela:** Preço de venda abaixo do mínimo para a meta

---

## 📌 Observações Técnicas

* **Cálculo em Tempo Real:** Recálculo a cada entrada de dado
* **Zero Dependências:** Sem bibliotecas ou frameworks externos
* **Sem Build:** Servido diretamente como arquivos estáticos
* **Acessibilidade:** ARIA labels, regiões live e navegação por teclado
* **Performance:** < 2s de carregamento inicial; offline após primeira visita

---

## 📄 Licença

Apache License 2.0 — Veja `LICENSE` para detalhes.
