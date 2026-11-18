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
if novo != html:
    open(caminho, "w", encoding="utf-8", newline="").write(novo)
print(f"{n} arquivo(s) com versão atualizada no index.html")
sys.exit(0)
