const { Ollama, Document, VectorStoreIndex, Settings } = require("llamaindex");
const fs = require("fs").promises;

const ollama = new Ollama({ model: "llama3.1:latest", temperature: 0.75 });

// Use Ollama LLM and Embed Model
Settings.llm = ollama;
Settings.embedModel = ollama;

async function main() {
  const essay = await fs.readFile("./node_modules/llamaindex/examples/abramov.txt", "utf-8");

  const document = new Document({ text: essay, id_: "essay" });

  // Load and index documents
  const index = await VectorStoreIndex.fromDocuments([document]);

  // get retriever
  const retriever = index.asRetriever();

  // Create a query engine
  const queryEngine = index.asQueryEngine({
    retriever,
  });

  const query = "What is the meaning of life?";

  // Query
  const response = await queryEngine.query({
    query,
  });

  // Log the response
  console.log(response.response);
}

main().catch(console.error);