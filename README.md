# 🟨 BACKROOMS CRAFT

> Você tropeçou e atravessou o chão da realidade. Agora é **você contra o Vazio**.

Jogo voxel de ação em primeira pessoa (estilo Minecraft) com tema **Backrooms**.
Nada de sobrevivência pacífica: aqui os monstros caçam **você** — colete o que precisa,
quebre paredes, erga barricadas, lute e **escape nível por nível**.

**Funciona direto no navegador — PC e celular**, sem instalar nada.

## 🎮 Como jogar

### No celular 📱
- **Joystick** (lado esquerdo): andar — empurre até a borda para **correr**
- **Arrastar** (lado direito): olhar / mirar
- **⚔️ atacar**: golpeia monstros ou quebra o bloco mirado (segure para repetir)
- **⬆️ pular** · **🧱 bloco**: coloca uma barricada · **🥤 beber**: Água de Amêndoas
- Dica: jogue na horizontal

### No PC 🖥️
- **WASD** anda · **Shift** corre · **Espaço** pula
- **Clique esquerdo**: atacar / quebrar bloco (segure)
- **Clique direito**: colocar bloco
- **F**: beber Água de Amêndoas

## 📜 Regras do Vazio

- Em cada nível, colete os **itens do objetivo** (fusíveis, chaves, válvulas…) para
  abrir o **buraco noclip** — o portal escuro que leva ao próximo nível.
- **Vida** ❤️: monstros e pisos eletrificados machucam. **Água de Amêndoas** 🥤 cura.
- **Fôlego** 🟡: correr cansa.
- **Sanidade** 🟣: o escuro e a presença de monstros corroem sua mente. Com a sanidade
  baixa, os monstros ficam mais rápidos e vêm de mais longe. Se zerar… a vida escorre.
- **Blocos** 🧱: quebre paredes e caixas para ganhar blocos e construa barricadas
  contra as matilhas.
- Seu progresso fica salvo no navegador (níveis destravados).

## 🗺️ Os níveis

| Nível | Lugar | Habitantes |
|---|---|---|
| **0** | As Salas Amarelas — labirinto de papel de parede e zumbido eterno | 😁 Sorridentes, que vivem nas zonas escuras |
| **1** | O Armazém — concreto, névoa e pilares infinitos | 🐺 Cães do Vazio, rápidos e em bando |
| **2** | Tubulações — túneis quentes e vapor | 🫥 Ladrões de Pele, que fingem estar parados |
| **3** | A Central Elétrica — geradores e pisos eletrificados | 👤 Facelings, fortes e sem rosto |
| **!** | A Fuga — arena onde a realidade sangra | 💀 O **Guardião do Vazio** (chefe final) |

Cada nível tem **mapa gerado proceduralmente**, paleta, armas e perigos próprios.
A arma evolui a cada nível: cano de metal → pé de cabra → chave inglesa → machado de
incêndio → **Machado do Êxodo**.

## 🚀 Rodando

É um site estático — não tem build:

```bash
# qualquer servidor estático serve, por exemplo:
python3 -m http.server 8080
# e abra http://localhost:8080
```

Ou publique no **GitHub Pages** (o workflow em `.github/workflows/pages.yml` já faz isso
a cada push).

## 🧱 Tecnologia

- [Three.js](https://threejs.org/) (vendorizado em `lib/`, sem CDN) + JavaScript puro (ES modules)
- Engine voxel própria: malha por chunks com face culling, colisão AABB, raycast de blocos
- Mapas procedurais com seed fixa (labirinto, armazém, túneis, salas, arena)
- Sons 100% procedurais via WebAudio — nenhum asset externo
- Controles de toque (joystick virtual) e teclado/mouse

```
src/
├── main.js            # loop do jogo e estados (menu/intro/jogo/morte/vitória)
├── engine/            # world (voxels+mesh), player, física, raycast, input
├── game/              # níveis, geração de mapas, monstros, itens
├── ui/hud.js          # barras, contadores, mensagens
└── audio/sounds.js    # sons procedurais
```

---

*Feito com ☕ e medo de carpete úmido.*
