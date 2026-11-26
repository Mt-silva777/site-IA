export function TeacherPane() {
  return (
    <div className="teacher">
      <div className="teacher-history">
        <div className="notice">
          A IA professora ainda não está conectada. A integração com o Gemini (Etapa 5) e as regras
          pedagógicas (Etapa 6) vêm depois. Esta é apenas a estrutura do painel.
        </div>
      </div>
      <form className="teacher-input" onSubmit={(e) => e.preventDefault()}>
        <textarea disabled rows={3} placeholder="Pergunte algo sobre o seu código… (disponível na Etapa 5)" />
        <button type="submit" disabled>
          Enviar
        </button>
      </form>
    </div>
  )
}
