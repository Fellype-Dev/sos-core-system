import { useMemo, useState } from 'react';

function Attendance() {
  const [records, setRecords] = useState([]);

  const dateLabel = useMemo(
    () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    []
  );

  const markStatus = (studentId, status) => {
    setRecords((prev) =>
      prev.map((record) =>
        record.id === studentId
          ? {
              ...record,
              status,
            }
          : record
      )
    );
  };

  return (
    <section className="panel">
      <h1>CHAMADA DIARIA - {dateLabel}</h1>

      <div className="attendance-toolbar">
        <label>
          Turma
          <select defaultValue="">
            <option value="">Selecione...</option>
            <option value="A">Turma A</option>
            <option value="B">Turma B</option>
          </select>
        </label>

        <label>
          Periodo
          <select defaultValue="">
            <option value="">Selecione...</option>
            <option value="manha">Manha</option>
            <option value="tarde">Tarde</option>
          </select>
        </label>

        <button type="button">Salvar frequencia</button>
      </div>

      <table className="attendance-table">
        <thead>
          <tr>
            <th>Foto</th>
            <th>Nome do aluno</th>
            <th>Presenca</th>
            <th>Falta</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 && (
            <tr>
              <td colSpan="4">Nenhum aluno carregado para esta turma.</td>
            </tr>
          )}
          {records.map((record) => (
            <tr key={record.id}>
              <td>
                <span className="avatar-placeholder">{record.id}</span>
              </td>
              <td>{record.name}</td>
              <td>
                <input
                  type="checkbox"
                  checked={record.status === 'present'}
                  onChange={() => markStatus(record.id, 'present')}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={record.status === 'absent'}
                  onChange={() => markStatus(record.id, 'absent')}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export default Attendance;
