'use client';

import React, { useState } from 'react';

interface GridItem {
  numero: number;
  inicio: string;
  fim: string;
}

interface ResumoData {
  startStr: string;
  endStr: string;
  totalMins: number;
  intervalo: number;
  quantidade: number;
  grid: GridItem[];
}

interface ModalPendingData {
  modo: 1 | 2;
  startMins: number;
  endMins: number;
  totalMins: number;
  quantidade: number;
  intervalo: number;
  ceilInterval?: number;
  floorInterval?: number;
  diffUp?: number;
  diffDown?: number;
  minutosUltrapassar?: number;
  mensagemText: string;
}

export default function Home() {
  // Form State
  const [modo, setModo] = useState<'intervalo' | 'quantidade'>('intervalo');
  const [horaInicio, setHoraInicio] = useState<string>('00:00');
  const [horaFim, setHoraFim] = useState<string>('00:00');
  const [quantidadeInput, setQuantidadeInput] = useState<string>('4');
  const [intervaloInput, setIntervaloInput] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);

  // Modal State
  const [modalPending, setModalPending] = useState<ModalPendingData | null>(null);

  // Result State
  const [resumo, setResumo] = useState<ResumoData | null>(null);

  // Convert HH:mm to minutes
  const timeToMinutes = (timeStr: string): number => {
    if (!timeStr || !timeStr.includes(':')) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Convert minutes to HH:mm
  const minutesToTime = (totalMinutes: number): string => {
    let mins = Math.floor(totalMinutes) % 1440;
    if (mins < 0) mins += 1440;
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  };

  // Generate Schedule Table
  const gerarGrid = (startMins: number, intervalo: number, qtd: number): GridItem[] => {
    const grid: GridItem[] = [];
    let curr = startMins;
    for (let i = 1; i <= qtd; i++) {
      const next = curr + intervalo;
      grid.push({
        numero: i,
        inicio: minutesToTime(curr),
        fim: minutesToTime(next),
      });
      curr = next;
    }
    return grid;
  };

  // Finalize Calculation & Show Results
  const finalizarCalculo = (startMins: number, endMins: number, totalMins: number, inter: number, qtd: number) => {
    const grid = gerarGrid(startMins, inter, qtd);
    const startStr = minutesToTime(startMins);
    const endStr = minutesToTime(endMins);

    // Update End Time input field automatically
    setHoraFim(endStr);

    setResumo({
      startStr,
      endStr,
      totalMins,
      intervalo: inter,
      quantidade: qtd,
      grid,
    });
  };

  // Main Submit Handler
  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!horaInicio || !horaFim) {
      setErro('Por favor, preencha o Horário Inicial e o Horário Final.');
      return;
    }

    const startMins = timeToMinutes(horaInicio);
    const endMins = timeToMinutes(horaFim);

    if (startMins >= endMins) {
      setErro('O Horário Inicial deve ser menor que o Horário Final.');
      return;
    }

    const totalMins = endMins - startMins;

    if (modo === 'intervalo') {
      const qtd = parseInt(quantidadeInput, 10);
      if (isNaN(qtd) || qtd <= 0) {
        setErro('Informe uma quantidade válida de atendimentos (maior que zero).');
        return;
      }

      const sobra = totalMins % qtd;

      if (sobra === 0) {
        const inter = totalMins / qtd;
        finalizarCalculo(startMins, endMins, totalMins, inter, qtd);
      } else {
        const ceilInterval = Math.ceil(totalMins / qtd);
        const floorInterval = Math.floor(totalMins / qtd);
        const diffUp = (qtd * ceilInterval) - totalMins;
        const diffDown = totalMins - (qtd * floorInterval);

        setModalPending({
          modo: 1,
          startMins,
          endMins,
          totalMins,
          quantidade: qtd,
          intervalo: 0,
          ceilInterval,
          floorInterval,
          diffUp,
          diffDown,
          mensagemText: `O cálculo gera um intervalo com segundos.\n\nDeseja aumentar o horário final em ${diffUp} minuto(s) para que todos os atendimentos possuam duração inteira?`,
        });
      }
    } else {
      const inter = parseInt(intervaloInput, 10);
      if (isNaN(inter) || inter <= 0) {
        setErro('Informe um intervalo em minutos válido (maior que zero).');
        return;
      }

      if (inter > totalMins) {
        setErro(`O intervalo (${inter} min) não pode ser maior que o tempo total (${totalMins} min).`);
        return;
      }

      const qtd = Math.floor(totalMins / inter);
      const sobra = totalMins % inter;

      if (sobra === 0) {
        finalizarCalculo(startMins, endMins, totalMins, inter, qtd);
      } else {
        const minutosUltrapassar = inter - sobra;

        setModalPending({
          modo: 2,
          startMins,
          endMins,
          totalMins,
          quantidade: qtd,
          intervalo: inter,
          minutosUltrapassar,
          mensagemText: `O último atendimento ultrapassará o horário final em ${minutosUltrapassar} minuto(s).\n\nDeseja permitir esse ajuste?`,
        });
      }
    }
  };

  // Modal Decision Handler
  const handleModalChoice = (escolha: 'SIM' | 'NAO') => {
    if (!modalPending) return;

    const calc = modalPending;
    setModalPending(null);

    if (calc.modo === 1) {
      let newEndMins: number;
      let newTotalMins: number;
      let finalInterval: number;

      if (escolha === 'SIM') {
        newEndMins = calc.endMins + (calc.diffUp || 0);
        newTotalMins = calc.totalMins + (calc.diffUp || 0);
        finalInterval = calc.ceilInterval || 0;
      } else {
        newEndMins = calc.endMins - (calc.diffDown || 0);
        newTotalMins = calc.totalMins - (calc.diffDown || 0);
        finalInterval = calc.floorInterval || 0;
      }

      finalizarCalculo(calc.startMins, newEndMins, newTotalMins, finalInterval, calc.quantidade);
    } else {
      let newEndMins: number;
      let newTotalMins: number;
      let finalQuantity: number;

      if (escolha === 'SIM') {
        finalQuantity = calc.quantidade + 1;
        newEndMins = calc.endMins + (calc.minutosUltrapassar || 0);
        newTotalMins = calc.totalMins + (calc.minutosUltrapassar || 0);
      } else {
        finalQuantity = calc.quantidade;
        newEndMins = calc.startMins + (finalQuantity * calc.intervalo);
        newTotalMins = finalQuantity * calc.intervalo;
      }

      finalizarCalculo(calc.startMins, newEndMins, newTotalMins, calc.intervalo, finalQuantity);
    }
  };

  // Clear Form
  const handleClear = () => {
    setModo('intervalo');
    setHoraInicio('00:00');
    setHoraFim('00:00');
    setQuantidadeInput('4');
    setIntervaloInput('');
    setErro(null);
    setResumo(null);
    setModalPending(null);
  };

  // Print Grade
  const handlePrint = () => {
    window.print();
  };

  return (
    <main className="min-vh-100 d-flex flex-column bg-dark text-light py-2 py-lg-3 px-2 px-md-3">
      <div className="container-fluid max-w-7xl mx-auto my-auto" style={{ maxWidth: '1280px' }}>
        
        {/* COMPACT TOP HEADER */}
        <header className="d-flex align-items-center justify-content-between mb-2 mb-lg-3 no-print">
          <div className="d-flex align-items-center gap-2">
            <div className="bg-primary text-white rounded-3 p-2 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
              <i className="bi bi-activity fs-5"></i>
            </div>
            <div>
              <h1 className="h4 fw-bold text-white mb-0" style={{ letterSpacing: '-0.02em' }}>GradeMed</h1>
              <p className="text-muted small mb-0 d-none d-sm-block">Grade de Atendimentos</p>
            </div>
          </div>
          <span className="badge bg-dark-subtle text-light border border-secondary fw-medium px-2.5 py-1.5 rounded-pill" style={{ fontSize: '0.75rem' }}>
            <i className="bi bi-clock me-1 text-primary"></i> HH:mm
          </span>
        </header>

        {/* SINGLE SCREEN GRID LAYOUT */}
        <div className="row g-2 g-lg-3 align-items-stretch">
          
          {/* LEFT COLUMN: COMPACT FORM */}
          <div className="col-lg-5 col-xl-4 no-print">
            <div className="custom-card h-100 d-flex flex-column">
              <div className="custom-card-header py-2 px-3 d-flex align-items-center gap-2">
                <i className="bi bi-sliders text-primary"></i>
                <h2 className="h6 mb-0 fw-bold">Parâmetros</h2>
              </div>
              <div className="card-body p-3 d-flex flex-column justify-content-between">
                
                {erro && (
                  <div className="alert alert-danger py-2 px-3 small mb-3 fade-in" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i>
                    {erro}
                  </div>
                )}

                <form onSubmit={handleCalculate} noValidate className="d-flex flex-column gap-3">
                  
                  {/* CALCULATION MODE */}
                  <div>
                    <label className="form-label fw-bold text-secondary small mb-1">
                      <i className="bi bi-gear-fill me-1"></i> Modo de Cálculo:
                    </label>
                    <div className="row g-2 calc-mode-radio">
                      <div className="col-6">
                        <input
                          type="radio"
                          className="btn-check"
                          name="modoCalculo"
                          id="modoIntervalo"
                          checked={modo === 'intervalo'}
                          onChange={() => {
                            setModo('intervalo');
                            setErro(null);
                          }}
                        />
                        <label className="btn btn-sm w-100 py-2 px-1 text-truncate" htmlFor="modoIntervalo">
                          <i className="bi bi-stopwatch"></i>
                          <span className="small">Intervalo</span>
                        </label>
                      </div>
                      <div className="col-6">
                        <input
                          type="radio"
                          className="btn-check"
                          name="modoCalculo"
                          id="modoQuantidade"
                          checked={modo === 'quantidade'}
                          onChange={() => {
                            setModo('quantidade');
                            setErro(null);
                          }}
                        />
                        <label className="btn btn-sm w-100 py-2 px-1 text-truncate" htmlFor="modoQuantidade">
                          <i className="bi bi-people"></i>
                          <span className="small">Quantidade</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* START & END TIME */}
                  <div className="row g-2">
                    <div className="col-6">
                      <label htmlFor="horaInicio" className="form-label fw-bold text-light small mb-1">
                        Início:
                      </label>
                      <input
                        type="time"
                        id="horaInicio"
                        className="form-control form-control-sm text-center fw-bold"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label htmlFor="horaFim" className="form-label fw-bold text-light small mb-1">
                        Término:
                      </label>
                      <input
                        type="time"
                        id="horaFim"
                        className="form-control form-control-sm text-center fw-bold"
                        value={horaFim}
                        onChange={(e) => setHoraFim(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* DYNAMIC FIELD */}
                  <div>
                    {modo === 'intervalo' ? (
                      <div>
                        <label htmlFor="quantidadeInput" className="form-label fw-bold text-light small mb-1">
                          Quantidade de Atendimentos:
                        </label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text bg-dark text-light border-secondary"><i className="bi bi-person-fill"></i></span>
                          <input
                            type="number"
                            id="quantidadeInput"
                            className="form-control form-control-sm fw-bold"
                            min="1"
                            placeholder="Ex: 4"
                            value={quantidadeInput}
                            onChange={(e) => setQuantidadeInput(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="intervaloInput" className="form-label fw-bold text-light small mb-1">
                          Intervalo (em minutos):
                        </label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text bg-dark text-light border-secondary"><i className="bi bi-hourglass-split"></i></span>
                          <input
                            type="number"
                            id="intervaloInput"
                            className="form-control form-control-sm fw-bold"
                            min="1"
                            placeholder="Ex: 17"
                            value={intervaloInput}
                            onChange={(e) => setIntervaloInput(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="d-grid gap-2 pt-1">
                    <button type="submit" className="btn btn-primary fw-bold shadow-sm py-2">
                      <i className="bi bi-calculator-fill me-1"></i> CALCULAR GRADE
                    </button>
                    <button
                      type="button"
                      onClick={handleClear}
                      className="btn btn-outline-secondary btn-sm fw-semibold"
                    >
                      <i className="bi bi-arrow-counterclockwise me-1"></i> Limpar
                    </button>
                  </div>
                </form>

              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: SUMMARY & COMPACT SCROLLABLE SCHEDULE TABLE */}
          <div className="col-lg-7 col-xl-8">
            <div id="areaExportacao" className="h-100 d-flex flex-column gap-2">
              
              {/* PRINT HEADER */}
              <div className="print-header d-none">
                <h2 className="h4 fw-bold">Grade de Atendimentos</h2>
                <p className="mb-0 small">Escala Gerada de Horários de Atendimento</p>
              </div>

              {resumo ? (
                <>
                  {/* PROMINENT HIGHLIGHTS FOR MAIN RESULTS (INTERVALO E QUANTIDADE) */}
                  <div className="row g-2 mb-1">
                    <div className="col-6">
                      <div className="p-2.5 rounded-3 bg-primary bg-gradient text-white shadow-sm border border-primary-subtle">
                        <div>
                          <span className="badge bg-warning text-dark mb-1 px-1.5 py-0.5" style={{ fontSize: '0.7rem' }}>
                            <i className="bi bi-star-fill"></i>
                          </span>
                          <div className="text-white-50 small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                            Intervalo
                          </div>
                          <div className="fs-4 fw-extrabold text-white lh-1">
                            {resumo.intervalo} <span className="fs-6 fw-normal text-white-50">min</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="p-2.5 rounded-3 bg-dark bg-gradient text-white shadow-sm border border-secondary">
                        <div>
                          <span className="badge bg-info text-dark mb-1 px-1.5 py-0.5" style={{ fontSize: '0.7rem' }}>
                            <i className="bi bi-check-circle-fill"></i>
                          </span>
                          <div className="text-white-50 small fw-bold text-uppercase" style={{ fontSize: '0.7rem' }}>
                            Quantidade
                          </div>
                          <div className="fs-4 fw-extrabold text-info lh-1">
                            {resumo.quantidade} <span className="fs-6 fw-normal text-white-50">atend.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COMPACT SUMMARY CARD */}
                  <div className="summary-card shadow-sm p-2 p-md-3">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold text-white small">
                        <i className="bi bi-pie-chart-fill me-1 text-info"></i> Resumo Completo
                      </span>
                      <span className="badge bg-info text-dark font-monospace fw-bold px-2 py-1" style={{ fontSize: '0.75rem' }}>
                        Minutos Inteiros
                      </span>
                    </div>
                    <div className="row g-2 text-center">
                      <div className="col">
                        <div className="summary-box py-1 px-2">
                          <div className="label">Início</div>
                          <div className="value fs-6">{resumo.startStr}</div>
                        </div>
                      </div>
                      <div className="col">
                        <div className="summary-box py-1 px-2">
                          <div className="label">Término</div>
                          <div className="value fs-6">{resumo.endStr}</div>
                        </div>
                      </div>
                      <div className="col">
                        <div className="summary-box py-1 px-2">
                          <div className="label">Total</div>
                          <div className="value fs-6">{resumo.totalMins}m</div>
                        </div>
                      </div>
                      <div className="col">
                        <div className="summary-box summary-box-highlight py-1 px-2 border-warning">
                          <div className="label text-warning">Intervalo</div>
                          <div className="value fs-6 text-warning">{resumo.intervalo}m</div>
                        </div>
                      </div>
                      <div className="col">
                        <div className="summary-box summary-box-highlight py-1 px-2 border-info">
                          <div className="label text-info">Qtd</div>
                          <div className="value fs-6 text-info">{resumo.quantidade}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SCHEDULE TABLE CARD */}
                  <div className="custom-card flex-grow-1 d-flex flex-column overflow-hidden">
                    <div className="custom-card-header py-2 px-3 d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-table text-primary"></i>
                        <h3 className="h6 mb-0 fw-bold">Horários</h3>
                      </div>
                      <div className="no-print">
                        <button
                          onClick={handlePrint}
                          type="button"
                          className="btn btn-xs btn-outline-light fw-semibold py-1 px-2.5"
                          style={{ fontSize: '0.8rem' }}
                        >
                          <i className="bi bi-printer-fill me-1 text-primary"></i> Imprimir
                        </button>
                      </div>
                    </div>
                    
                    {/* SCROLLABLE TABLE CONTAINER */}
                    <div className="card-body p-0 flex-grow-1 overflow-auto" style={{ maxHeight: 'calc(100vh - 270px)', minHeight: '260px' }}>
                      <table className="table table-hover schedule-table mb-0 align-middle">
                        <thead className="sticky-top bg-dark shadow-sm">
                          <tr>
                            <th className="py-2 px-3" style={{ width: '15%' }}>Nº</th>
                            <th className="py-2 px-3" style={{ width: '35%' }}>Início</th>
                            <th className="py-2 px-3" style={{ width: '35%' }}>Fim</th>
                            <th className="py-2 px-3" style={{ width: '15%' }}>Duração</th>
                          </tr>
                        </thead>
                        <tbody>
                          {resumo.grid.map((item) => (
                            <tr key={item.numero}>
                              <td className="py-1.5 px-3">
                                <span className="badge bg-primary text-white rounded-pill px-2.5 py-1">
                                  #{item.numero}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 fw-bold text-light">
                                <i className="bi bi-clock me-1 text-primary"></i> {item.inicio}
                              </td>
                              <td className="py-1.5 px-3 fw-bold text-light">
                                <i className="bi bi-clock-fill me-1 text-success"></i> {item.fim}
                              </td>
                              <td className="py-1.5 px-3 text-muted">
                                <span className="badge bg-dark-subtle text-light border border-secondary py-1 px-2">
                                  {resumo.intervalo} min
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                /* EMPTY STATE PLACEHOLDER */
                <div className="custom-card h-100 d-flex align-items-center justify-content-center text-center p-4">
                  <div className="py-4">
                    <div className="text-primary mb-3">
                      <i className="bi bi-calendar-check fs-1"></i>
                    </div>
                    <h3 className="h6 fw-bold text-light mb-1">Aguardando Parâmetros</h3>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      {modalPending && (
        <>
          <div className="modal show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border border-secondary shadow-lg bg-dark text-light" style={{ borderRadius: '1rem', overflow: 'hidden' }}>
                <div className="modal-header bg-dark-subtle text-white p-3 border-bottom border-secondary">
                  <div className="d-flex align-items-center gap-2">
                    <div className="bg-warning text-dark rounded-circle p-1.5 d-flex align-items-center justify-content-center" style={{ width: '36px', height: '36px' }}>
                      <i className="bi bi-exclamation-triangle-fill fs-6"></i>
                    </div>
                    <h4 className="modal-title h6 fw-bold mb-0">Ajuste de Horário Necessário</h4>
                  </div>
                </div>
                <div className="modal-body p-3 fs-6 text-light" style={{ whiteSpace: 'pre-line' }}>
                  {modalPending.mensagemText}
                </div>
                <div className="modal-footer bg-dark-subtle p-2.5 border-top border-secondary d-flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleModalChoice('NAO')}
                    className="btn btn-outline-light flex-grow-1 fw-bold"
                  >
                    NÃO
                  </button>
                  <button
                    type="button"
                    onClick={() => handleModalChoice('SIM')}
                    className="btn btn-primary flex-grow-1 fw-bold"
                  >
                    SIM
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show"></div>
        </>
      )}
    </main>
  );
}
