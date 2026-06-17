require("dotenv").config()
const express = require("express")
const app = express()
const path = require("path")
const mysql = require("mysql2/promise")
const PORT = 3000

const pool = mysql.createPool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT || 3306),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
})

app.use(express.json())

function validarFilmes(req, res, next) {
    const generosPermitidos = ["acao", "comedia", "drama", "terror", "ficcao", "documentario", "animacao", "outro"]
    //const {titulo, realizador, genero, ano, tipo, avaliacao, visto } = req.body
    const { titulo, realizador, genero, ano, tipo, avaliacao } = req.body
    

    const tituloValido = String(titulo).trim()
    const realizadorValido = String(realizador).trim()
    const generoValido = String(genero).trim()
    const anoNumero = Number(ano)
    const tipoValido = String(tipo).trim()
    const avaliacaoNumero = Number(avaliacao)
    const anoAtual = new Date().getFullYear()

 
    if (tituloValido.length < 2 || tituloValido > 200) {
        return res.status(400).json({ error: "Título obrigatório (entre 2 e 200 caracteres" })
    }

    if (realizadorValido.length < 1 || realizadorValido > 200) {
        return res.status(400).json({ error: "Realizador obrigatório (entre 1 e 200 caracteres"})
    }
    if (!generosPermitidos.includes(generoValido)) {
        return res.status(400).json({ error: "Genero inválido"})
    }
    if (anoNumero < 1900 || anoNumero > anoAtual) {
        return res.status(400).json({ error: `Ano inválido (entre 1900 e §{anoAtual})`})
    }
    if (!["filme", "serie"].includes(tipoValido)) {
        return res.status(400).json({ error: "Tipo de filme obrigatório"})
    }
    if (avaliacaoNumero < 1 || avaliacaoNumero > 5) {
        return res.status(400).json({ error: "Avaliação tem de ser entre 1 e 5"})
    }
    
    
    
    req.body = {
        titulo: tituloValido,
        realizador: realizadorValido,
        genero: generoValido,
        ano: anoNumero,
        tipo: tipoValido,
        avaliacao: avaliacaoNumero,
        
    }
    next()
}
// | `GET` | `/api/estado` | Testar se a API esta ativa | `200` |
app.get("/api/estado", async (req, res) => {
  res.status(200).json({ message: "API está ativa"})
})

//| `GET` | `/api/filmes` | Listar todos os filmes/series | `200` |
app.get("/api/filmes", async (req, res) => {
  const query = "SELECT * FROM filmes"
  const [filmes] = await pool.execute(query)

  res.status(200).json(filmes)
})

//| `GET` | `/api/filmes/:id` | Obter um filme/serie por ID | `200` ou `404` |
app.get("/api/filmes/:id", async (req, res) => {
  const id = Number(req.params.id)
  const query = "SELECT * FROM filmes where id = ?"
  const [filmes] = await pool.execute(query, [id])
  if (filmes.length === 0) {
    res.status(404).json({ message: "Esse filme não existe!"})
  }

  res.status(200).json(filmes[0])
})

//| `POST` | `/api/filmes` | Criar um filme/serie | `201` ou `400` |
app.post("/api/filmes", validarFilmes, async (req, res) => {
  const { titulo, realizador, genero, ano, tipo, avaliacao } = req.body
    
  if (!titulo || !realizador || !genero || !ano || !tipo) {
    return res.status(400).json({ erro: "Preencher campos obrigatórios" })
  }
  const query = "INSERT INTO filmes (titulo, realizador, genero, ano, tipo, avaliacao) VALUES (?,?,?,?,?,?)"
  const [resposta] = await pool.execute(query, [titulo, realizador, genero, ano, tipo, avaliacao])


  res.status(201).json({ mensagem: "Filme criado com sucesso!" })
})

// | `PUT` | `/api/filmes/:id` | Atualizar um filme/serie completo | `200`, `400` ou `404` |
app.put("/api/filmes/:id", validarFilmes, async (req, res) => {
  const id = Number(req.params.id)
  const query = "SELECT * FROM filmes WHERE id = ?"
  const [filmes] = await pool.execute(query, [id])
  if (filmes.length === 0) {
    return res.status(404).json({ erro: "Este filme não existe!" })
  }
  const { titulo, realizador, genero, ano, tipo, avaliacao } = req.body

  
  if (!titulo || !realizador || !genero || !ano || !tipo) {
    return res.status(400).json({ erro: "Preencher campos obrigatórios!" })
  }
  const query2 = "UPDATE filmes SET titulo = ?, realizador = ?, genero = ?, ano = ?, tipo = ? WHERE id = ?"
  const [resultado] = await pool.execute(query2, [titulo, realizador, genero, ano, tipo, id])

  res.status(200).json({ mensagem: "Filme alterado com sucesso" })
})

//| `PATCH` | `/api/filmes/:id/visto` | Alternar o estado `visto` | `200` ou `404` |
app.patch("/api/filmes/:id/visto", async (req, res) => {
  const id = Number(req.params.id)
  const query = "SELECT * FROM filmes WHERE id = ?"
  const [filmes] = await pool.execute(query, [id])
  if (filmes.length === 0) {
    return res.status(404).json({ mensagem: "Filme não existe!" })
  }
  
  const novoValor = Number(filmes[0].visto) === 1 ? 0 : 1
  const query2 = "UPDATE filmes SET visto = ? WHERE id = ?"
  await pool.execute(query2, [novoValor, id])

  res.status(200).json({ mensagem: `Visto alterado com sucesso` })
})


// | `DELETE` | `/api/filmes/:id` | Apagar um filme/serie | `204` ou `404` |
app.delete("/api/filmes/:id", async (req, res) => {
  const id = Number(req.params.id)
  const query = "SELECT * FROM filmes WHERE id = ?"
  const [filmes] = await pool.execute(query, [id])
  if (filmes.length === 0) {
    return res.status(404).json({ erro: "Filme não encontrado" })

  }

  const query2 = "DELETE FROM filmes WHERE id = ?"
  const [resposta] = await pool.execute(query2, [id])

  res.status(204).json({ mensagem: "Filme eliminado com sucesso!" })
})

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada!", rota: req.url })
})

app.use((erro, req, res, next) => {
  console.log("Erro: ", erro.mensagem)
  res.status(500).json({ erro: "Erro no servidor!", rota: req.url, req: req.method })

})

app.listen(PORT, async () => {
  console.log(`O servidor está aberto na porta ${PORT}`)
  try {
    await pool.execute("SELECT 1")
    console.log("Ligada à base de dados")
  } catch (error) {
    console.log("Erro na ligação ao servidor SQL")
  }

})