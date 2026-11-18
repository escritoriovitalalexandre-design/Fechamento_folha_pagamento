"""Atualiza o "?v=" das tags <script src="js/..."> e <link href="css/..."> do index.html
com um código curto do conteúdo de cada arquivo. Assim, quando um arquivo muda, o
navegador baixa a versão nova em vez de usar a que estava guardada no cache.

Uso (na pasta do projeto):  python ferramentas/atualizar_versoes.py
Rode sempre antes de publicar uma mudança em css/ ou js/.
"""
import hashlib, os, re, sys

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
caminho = os.path.join(raiz, "index.html")
html = open(caminho, encoding="utf-8", newline="").read()

def versao(arquivo):
    with open(os.path.join(raiz, arquivo), "rb") as f:
        return hashlib.sha256(f.read().replace(b"\r\n", b"\n")).hexdigest()[:10]

def trocar(m):
    arquivo = m.group(2)
    return f'{m.group(1)}{arquivo}?v={versao(arquivo)}"'

novo, n = re.subn(r'((?:src|href)=")((?:js|css)/[^"?]+)(?:\?v=[^"]*)?"', trocar, html)

# Versão geral do sistema: muda quando qualquer js/css ou o próprio index.html muda.
# O js/00-atualizacao.js compara esta versão com a publicada e recarrega a página.
META = re.compile(r'<meta name="versao-sistema" content="[^"]*">')
if not META.search(novo):
    quebra = "\r\n" if "\r\n" in novo else "\n"
    novo = novo.replace('<meta charset="UTF-8">', '<meta charset="UTF-8">' + quebra + '<meta name="versao-sistema" content="">', 1)
base = META.sub('<meta name="versao-sistema" content="">', novo).replace("\r\n", "\n").encode("utf-8")
versao_sistema = hashlib.sha256(base).hexdigest()[:12]
novo = META.sub(f'<meta name="versao-sistema" content="{versao_sistema}">', novo)

if novo != html:
    open(caminho, "w", encoding="utf-8", newline="").write(novo)
print(f"{n} arquivo(s) com versão atualizada; versão do sistema: {versao_sistema}")
sys.exit(0)
