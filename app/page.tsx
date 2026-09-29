'use client';

import React, { useState, useEffect } from 'react';
import { APP_VERSION } from '@/lib/version';

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
  const [quantidadeInput, setQuantidadeInput] = useState<string>('');
  const [intervaloInput, setIntervaloInput] = useState<string>('');
  const [erro, setErro] = useState<string | null>(null);

  // Modal State
  const [modalPending, setModalPending] = useState<ModalPendingData | null>(null);

  // Result State
  const [resumo, setResumo] = useState<ResumoData | null>(null);

  // Auto-Update & Cache Buster: detecta novas versões implantadas e atualiza o navegador imediatamente
  useEffect(() => {
    const checkAppVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.version && data.version !== APP_VERSION) {
            console.log(`Nova versão detectada: ${data.version} (atual: ${APP_VERSION}). Atualizando...`);
            if (typeof window !== 'undefined' && 'caches' in window) {
              const cacheKeys = await window.caches.keys();
              await Promise.all(cacheKeys.map((key) => window.caches.delete(key)));
            }
            window.location.reload();
          }
        }
      } catch {
        // Silencioso em caso de erro transitório de conexão
      }
    };

    checkAppVersion();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAppVersion();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('focus', checkAppVersion);
    const interval = setInterval(checkAppVersion, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('focus', checkAppVersion);
      clearInterval(interval);
    };
  }, []);

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
    setQuantidadeInput('');
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
    <main className="app-viewport d-flex flex-column py-2 py-lg-3 px-2 px-md-4">
      <div className="container-fluid max-w-7xl mx-auto d-flex flex-column app-container w-100" style={{ maxWidth: '1280px' }}>
        
        {/* COMPACT TOP HEADER */}
        <header className="d-flex align-items-center justify-content-between mb-2 mb-lg-2.5 flex-shrink-0 no-print">
          <div className="d-flex align-items-center gap-2.5">
            <div className="bg-primary text-white rounded-1 p-2 d-flex align-items-center justify-content-center shadow-sm" style={{ width: '36px', height: '36px' }}>
              <i className="bi bi-activity fs-5"></i>
            </div>
            <h1 className="h4 fw-bold text-white mb-0" style={{ letterSpacing: '-0.02em', lineHeight: 1 }}>GradeMed</h1>
          </div>
          <span className="badge bg-dark-subtle text-light border border-secondary-subtle fw-medium px-2.5 py-1.5 rounded-1" style={{ fontSize: '0.75rem' }}>
            <i className="bi bi-clock me-1 text-primary"></i> HH:mm
          </span>
        </header>

        {/* SINGLE SCREEN GRID LAYOUT */}
        <div className="row g-2 g-lg-3 app-main-row align-items-stretch">
          
          {/* LEFT COLUMN: COMPACT FORM */}
          <div className="col-lg-5 col-xl-4 app-col-scroll no-print">
            <div className="custom-card h-100 d-flex flex-column overflow-hidden">
              <div className="custom-card-header py-2 px-3 d-flex align-items-center gap-2 flex-shrink-0">
                <i className="bi bi-sliders text-primary"></i>
                <h2 className="h6 mb-0 fw-bold">Parâmetros</h2>
              </div>
              <div className="card-body p-3 d-flex flex-column overflow-y-auto flex-grow-1">
                
                {erro && (
                  <div className="alert alert-danger-theme py-2 px-3 small mb-3 fade-in" role="alert">
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
                        <div className="input-group input-group-sm input-group-separated">
                          <span className="input-group-text"><i className="bi bi-person-fill"></i></span>
                          <input
                            type="number"
                            id="quantidadeInput"
                            className="form-control form-control-sm fw-bold"
                            min="1"
                            placeholder="Ex: 10"
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
                        <div className="input-group input-group-sm input-group-separated">
                          <span className="input-group-text"><i className="bi bi-hourglass-split"></i></span>
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
          <div className="col-lg-7 col-xl-8 app-col-scroll">
            <div id="areaExportacao" className="h-100 d-flex flex-column gap-2 overflow-hidden" style={{ minHeight: 0 }}>
              
              {/* PRINT HEADER */}
              <div className="print-header d-none">
                <h2 className="h4 fw-bold">Grade de Atendimentos</h2>
                <p className="mb-0 small">Escala Gerada de Horários de Atendimento</p>
              </div>

              {resumo ? (
                <>
                  {/* PROMINENT HIGHLIGHTS FOR MAIN RESULTS (INTERVALO E QUANTIDADE) */}
                  <div className="row g-2 mb-1 flex-shrink-0">
                    <div className="col-6">
                      <div className="p-2.5 rounded-1 highlight-card highlight-card-primary shadow-sm">
                        <div>
                          <div className="d-flex align-items-center gap-1.5 mb-1">
                            <i className="bi bi-stopwatch" style={{ fontSize: '0.85rem', color: '#16c6de' }}></i>
                            <span className="small fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.04em', color: '#16c6de' }}>
                              Intervalo
                            </span>
                          </div>
                          <div className="fs-4 fw-extrabold text-white lh-1">
                            {resumo.intervalo} <span className="fs-6 fw-normal" style={{ color: '#8b99b5' }}>min</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-6">
                      <div className="p-2.5 rounded-1 highlight-card highlight-card-secondary shadow-sm">
                        <div>
                          <div className="d-flex align-items-center gap-1.5 mb-1">
                            <i className="bi bi-people-fill" style={{ fontSize: '0.85rem', color: '#52c232' }}></i>
                            <span className="small fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.04em', color: '#52c232' }}>
                              Quantidade
                            </span>
                          </div>
                          <div className="fs-4 fw-extrabold text-white lh-1">
                            {resumo.quantidade} <span className="fs-6 fw-normal" style={{ color: '#8b99b5' }}>atend.</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* COMPACT SUMMARY CARD */}
                  <div className="summary-card shadow-sm p-2 p-md-2.5 flex-shrink-0">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <span className="fw-bold text-white small">
                        <i className="bi bi-pie-chart-fill me-1" style={{ color: '#16c6de' }}></i> Resumo Completo
                      </span>
                      <span className="badge badge-info-theme font-monospace fw-bold px-2 py-1" style={{ fontSize: '0.75rem' }}>
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
                        <div className="summary-box py-1 px-2" style={{ borderColor: 'rgba(160, 86, 1, 0.45)' }}>
                          <div className="label" style={{ color: '#e68516' }}>Intervalo</div>
                          <div className="value fs-6" style={{ color: '#e68516' }}>{resumo.intervalo}m</div>
                        </div>
                      </div>
                      <div className="col">
                        <div className="summary-box py-1 px-2" style={{ borderColor: 'rgba(1, 144, 163, 0.45)' }}>
                          <div className="label" style={{ color: '#16c6de' }}>Qtd</div>
                          <div className="value fs-6" style={{ color: '#16c6de' }}>{resumo.quantidade}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SCHEDULE TABLE CARD */}
                  <div className="custom-card flex-grow-1 d-flex flex-column overflow-hidden" style={{ minHeight: 0 }}>
                    <div className="custom-card-header py-2 px-3 d-flex align-items-center justify-content-between flex-shrink-0">
                      <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-table" style={{ color: '#7ba4ec' }}></i>
                        <h3 className="h6 mb-0 fw-bold">Horários</h3>
                      </div>
                      <div className="no-print">
                        <button
                          onClick={handlePrint}
                          type="button"
                          className="btn btn-xs btn-outline-light fw-semibold py-1 px-2.5"
                          style={{ fontSize: '0.8rem' }}
                        >
                          <i className="bi bi-printer-fill me-1" style={{ color: '#7ba4ec' }}></i> Imprimir
                        </button>
                      </div>
                    </div>
                    
                    {/* SCROLLABLE TABLE CONTAINER */}
                    <div className="card-body p-0 flex-grow-1 overflow-y-auto" style={{ minHeight: 0 }}>
                      <table className="table table-hover schedule-table mb-0 align-middle">
                        <thead className="sticky-top shadow-sm" style={{ zIndex: 5 }}>
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
                                <span className="badge badge-appointment text-white rounded-1 px-2 py-0.5 font-monospace">
                                  #{item.numero}
                                </span>
                              </td>
                              <td className="py-1.5 px-3 fw-bold text-light">
                                <i className="bi bi-clock me-1" style={{ color: '#7ba4ec' }}></i> {item.inicio}
                              </td>
                              <td className="py-1.5 px-3 fw-bold text-light">
                                <i className="bi bi-clock-fill me-1" style={{ color: '#52c232' }}></i> {item.fim}
                              </td>
                              <td className="py-1.5 px-3">
                                <span className="badge bg-dark-subtle text-light border border-secondary-subtle py-1 px-2 rounded-1">
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

        {/* FOOTER */}
        <footer className="mt-3 mt-lg-4 pt-2 pb-2 text-center flex-shrink-0 no-print" style={{ fontSize: '0.75rem' }}>
          <div className="d-flex justify-content-center align-items-center gap-2 text-secondary opacity-75">
            <span className="fw-medium text-light-emphasis">GradeMed</span>
            <span>•</span>
            <span>2026</span>
            <span>•</span>
            <span className="font-monospace">v{APP_VERSION}</span>
          </div>
        </footer>
      </div>

      {/* CONFIRMATION MODAL */}
      {modalPending && (
        <>
          <div className="modal show d-block" tabIndex={-1} role="dialog">
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border border-secondary shadow-lg bg-dark text-light" style={{ borderRadius: '4px', overflow: 'hidden' }}>
                <div className="modal-header bg-dark-subtle text-white p-3 border-bottom border-secondary">
                  <div className="d-flex align-items-center gap-2">
                    <div className="rounded-1 p-1.5 d-flex align-items-center justify-content-center text-white" style={{ width: '32px', height: '32px', backgroundColor: '#A05601' }}>
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
