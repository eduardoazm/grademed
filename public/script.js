/**
 * SISTEMA COMPLETO DE GERAÇÃO DE GRADE DE ATENDIMENTOS
 * Desenvolvido em JavaScript Puro (Vanilla JS)
 */

// Estado da Aplicação
let currentPendingCalculation = null;
let currentResults = null;

// Inicialização de Tooltips e Eventos
document.addEventListener('DOMContentLoaded', function () {
    // Registrar Ouvintes de Eventos
    const radioModoIntervalo = document.getElementById('modoIntervalo');
    const radioModoQuantidade = document.getElementById('modoQuantidade');

    if (radioModoIntervalo) {
        radioModoIntervalo.addEventListener('change', toggleModoCalculo);
    }
    if (radioModoQuantidade) {
        radioModoQuantidade.addEventListener('change', toggleModoCalculo);
    }

    const formCalculo = document.getElementById('formCalculo');
    if (formCalculo) {
        formCalculo.addEventListener('submit', function (e) {
            e.preventDefault();
            executarCalculo();
        });
    }

    const btnLimpar = document.getElementById('btnLimpar');
    if (btnLimpar) {
        btnLimpar.addEventListener('click', limparFormulario);
    }

    const btnImprimir = document.getElementById('btnImprimir');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', imprimirGrade);
    }

    const btnModalSim = document.getElementById('btnModalSim');
    if (btnModalSim) {
        btnModalSim.addEventListener('click', function () {
            confirmarModal('SIM');
        });
    }

    const btnModalNao = document.getElementById('btnModalNao');
    if (btnModalNao) {
        btnModalNao.addEventListener('click', function () {
            confirmarModal('NAO');
        });
    }
});

/**
 * Converte um horário no formato HH:mm para minutos totais desde a meia-noite
 */
function timeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return 0;
    return hours * 60 + minutes;
}

/**
 * Converte minutos totais desde a meia-noite para o formato HH:mm
 */
function minutesToTime(totalMinutes) {
    let mins = Math.floor(totalMinutes) % 1440;
    if (mins < 0) mins += 1440;
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Calcula o tempo total disponível em minutos entre dois horários
 */
function calculateTotalTime(startMins, endMins) {
    return endMins - startMins;
}

/**
 * Alterna a visibilidade dos campos dependendo do modo de cálculo selecionado
 */
function toggleModoCalculo() {
    const modoIntervalo = document.getElementById('modoIntervalo').checked;
    const grupoQuantidade = document.getElementById('grupoQuantidade');
    const grupoIntervalo = document.getElementById('grupoIntervalo');

    if (modoIntervalo) {
        grupoQuantidade.classList.remove('d-none');
        grupoIntervalo.classList.add('d-none');
        document.getElementById('quantidadeInput').setAttribute('required', 'required');
        document.getElementById('intervaloInput').removeAttribute('required');
    } else {
        grupoQuantidade.classList.add('d-none');
        grupoIntervalo.classList.remove('d-none');
        document.getElementById('intervaloInput').setAttribute('required', 'required');
        document.getElementById('quantidadeInput').removeAttribute('required');
    }
    ocultarErro();
}

/**
 * Valida o formulário antes de executar os cálculos
 */
function validarFormulario() {
    ocultarErro();

    const horaInicioStr = document.getElementById('horaInicio').value;
    const horaFimStr = document.getElementById('horaFim').value;
    const modoIntervalo = document.getElementById('modoIntervalo').checked;

    if (!horaInicioStr || !horaFimStr) {
        exibirErro('Por favor, preencha o Horário Inicial e o Horário Final.');
        return null;
    }

    const startMins = timeToMinutes(horaInicioStr);
    const endMins = timeToMinutes(horaFimStr);

    if (startMins >= endMins) {
        exibirErro('O Horário Inicial deve ser menor que o Horário Final.');
        return null;
    }

    const totalMins = calculateTotalTime(startMins, endMins);

    if (modoIntervalo) {
        const quantidade = parseInt(document.getElementById('quantidadeInput').value, 10);
        if (isNaN(quantidade) || quantidade <= 0) {
            exibirErro('Informe uma quantidade válida de atendimentos (maior que zero).');
            return null;
        }
        return { modo: 1, horaInicioStr, horaFimStr, startMins, endMins, totalMins, quantidade };
    } else {
        const intervalo = parseInt(document.getElementById('intervaloInput').value, 10);
        if (isNaN(intervalo) || intervalo <= 0) {
            exibirErro('Informe um intervalo em minutos válido (maior que zero).');
            return null;
        }
        if (intervalo > totalMins) {
            exibirErro(`O intervalo (${intervalo} min) não pode ser maior que o tempo total (${totalMins} min).`);
            return null;
        }
        return { modo: 2, horaInicioStr, horaFimStr, startMins, endMins, totalMins, intervalo };
    }
}

/**
 * Função principal para execução do cálculo
 */
function executarCalculo() {
    const dados = validarFormulario();
    if (!dados) return;

    if (dados.modo === 1) {
        const { startMins, endMins, totalMins, quantidade } = dados;
        const sobra = totalMins % quantidade;

        if (sobra === 0) {
            const intervalo = totalMins / quantidade;
            finalizarECalcularGrid({
                startMins,
                endMins,
                totalMins,
                intervalo,
                quantidade
            });
        } else {
            const ceilInterval = Math.ceil(totalMins / quantidade);
            const floorInterval = Math.floor(totalMins / quantidade);
            const diffUp = (quantidade * ceilInterval) - totalMins;
            const diffDown = totalMins - (quantidade * floorInterval);

            currentPendingCalculation = {
                modo: 1,
                startMins,
                endMins,
                totalMins,
                quantidade,
                ceilInterval,
                floorInterval,
                diffUp,
                diffDown
            };

            abrirModal(`O cálculo gera um intervalo com segundos.<br><br>Deseja aumentar o horário final em <strong>${diffUp} minuto(s)</strong> para que todos os atendimentos possuam duração inteira?`);
        }
    } else {
        const { startMins, endMins, totalMins, intervalo } = dados;
        const quantidade = Math.floor(totalMins / intervalo);
        const sobra = totalMins % intervalo;

        if (sobra === 0) {
            finalizarECalcularGrid({
                startMins,
                endMins,
                totalMins,
                intervalo,
                quantidade
            });
        } else {
            const minutosUltrapassar = intervalo - sobra;

            currentPendingCalculation = {
                modo: 2,
                startMins,
                endMins,
                totalMins,
                intervalo,
                quantidade,
                sobra,
                minutosUltrapassar
            };

            abrirModal(`O último atendimento ultrapassará o horário final em <strong>${minutosUltrapassar} minuto(s)</strong>.<br><br>Deseja permitir esse ajuste?`);
        }
    }
}

/**
 * Trata a resposta do modal (SIM / NAO)
 */
function confirmarModal(escolha) {
    fecharModal();
    if (!currentPendingCalculation) return;

    const calc = currentPendingCalculation;

    if (calc.modo === 1) {
        let newEndMins, newTotalMins, intervalo;
        if (escolha === 'SIM') {
            newEndMins = calc.endMins + calc.diffUp;
            newTotalMins = calc.totalMins + calc.diffUp;
            intervalo = calc.ceilInterval;
        } else {
            newEndMins = calc.endMins - calc.diffDown;
            newTotalMins = calc.totalMins - calc.diffDown;
            intervalo = calc.floorInterval;
        }

        document.getElementById('horaFim').value = minutesToTime(newEndMins);

        finalizarECalcularGrid({
            startMins: calc.startMins,
            endMins: newEndMins,
            totalMins: newTotalMins,
            intervalo: intervalo,
            quantidade: calc.quantidade
        });
    } else if (calc.modo === 2) {
        let newEndMins, newTotalMins, finalQuantidade;
        if (escolha === 'SIM') {
            finalQuantidade = calc.quantidade + 1;
            newEndMins = calc.endMins + calc.minutosUltrapassar;
            newTotalMins = calc.totalMins + calc.minutosUltrapassar;
        } else {
            finalQuantidade = calc.quantidade;
            newEndMins = calc.startMins + (finalQuantidade * calc.intervalo);
            newTotalMins = finalQuantidade * calc.intervalo;
        }

        document.getElementById('horaFim').value = minutesToTime(newEndMins);

        finalizarECalcularGrid({
            startMins: calc.startMins,
            endMins: newEndMins,
            totalMins: newTotalMins,
            intervalo: calc.intervalo,
            quantidade: finalQuantidade
        });
    }

    currentPendingCalculation = null;
}

/**
 * Finaliza os parâmetros calculados, gera a grade de atendimentos e atualiza a UI
 */
function finalizarECalcularGrid({ startMins, endMins, totalMins, intervalo, quantidade }) {
    const grid = gerarTabelaGrade(startMins, intervalo, quantidade);
    const startStr = minutesToTime(startMins);
    const endStr = minutesToTime(endMins);

    currentResults = {
        startStr,
        endStr,
        totalMins,
        intervalo,
        quantidade,
        grid
    };

    renderizarResultados(currentResults);
}

/**
 * Gera a lista de horários dos atendimentos
 */
function gerarTabelaGrade(startMins, intervalo, quantidade) {
    const grid = [];
    let curr = startMins;

    for (let i = 1; i <= quantidade; i++) {
        const next = curr + intervalo;
        grid.push({
            numero: i,
            inicio: minutesToTime(curr),
            fim: minutesToTime(next)
        });
        curr = next;
    }
    return grid;
}

/**
 * Renderiza o Card de Resumo e a Tabela na Tela
 */
function renderizarResultados(res) {
    document.getElementById('resumoHoraInicio').textContent = res.startStr;
    document.getElementById('resumoHoraFim').textContent = res.endStr;
    document.getElementById('resumoTempoTotal').textContent = `${res.totalMins}m`;
    document.getElementById('resumoIntervalo').textContent = `${res.intervalo}m`;
    document.getElementById('resumoQuantidade').textContent = `${res.quantidade}`;

    const destaqueIntervalo = document.getElementById('destaqueIntervalo');
    if (destaqueIntervalo) destaqueIntervalo.textContent = `${res.intervalo} min`;

    const destaqueQuantidade = document.getElementById('destaqueQuantidade');
    if (destaqueQuantidade) destaqueQuantidade.textContent = `${res.quantidade} atend.`;

    const tbody = document.getElementById('corpoTabelaAtendimentos');
    tbody.innerHTML = '';

    res.grid.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-1.5 px-3"><span class="badge bg-primary text-white rounded-pill px-2.5 py-1">#${item.numero}</span></td>
            <td class="py-1.5 px-3 fw-bold text-light"><i class="bi bi-clock me-1 text-primary"></i> ${item.inicio}</td>
            <td class="py-1.5 px-3 fw-bold text-light"><i class="bi bi-clock-fill me-1 text-success"></i> ${item.fim}</td>
            <td class="py-1.5 px-3 text-muted"><span class="badge bg-dark-subtle text-light border border-secondary py-1 px-2">${res.intervalo} min</span></td>
        `;
        tbody.appendChild(tr);
    });

    // Alterna estado vazio x resultados
    const emptyState = document.getElementById('emptyState');
    const containerResultados = document.getElementById('containerResultados');
    if (emptyState) emptyState.classList.add('d-none');
    if (containerResultados) {
        containerResultados.classList.remove('d-none');
        containerResultados.classList.add('d-flex');
    }
}

/**
 * Exibe o Modal Bootstrap
 */
function abrirModal(htmlMensagem) {
    const modalBody = document.getElementById('confirmModalTexto');
    if (modalBody) {
        modalBody.innerHTML = htmlMensagem;
    }
    const modalEl = document.getElementById('confirmModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modalInstance = new bootstrap.Modal(modalEl);
        modalInstance.show();
    }
}

/**
 * Fecha o Modal Bootstrap
 */
function fecharModal() {
    const modalEl = document.getElementById('confirmModal');
    if (modalEl && typeof bootstrap !== 'undefined') {
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) {
            modalInstance.hide();
        }
    }
}

/**
 * Exibe mensagem de erro
 */
function exibirErro(mensagem) {
    const alerta = document.getElementById('alertaErro');
    if (alerta) {
        alerta.textContent = mensagem;
        alerta.classList.remove('d-none');
    }
}

/**
 * Oculta mensagem de erro
 */
function ocultarErro() {
    const alerta = document.getElementById('alertaErro');
    if (alerta) {
        alerta.classList.add('d-none');
        alerta.textContent = '';
    }
}

/**
 * Limpa todos os campos do formulário e oculta os resultados
 */
function limparFormulario() {
    document.getElementById('formCalculo').reset();
    const horaInicio = document.getElementById('horaInicio');
    const horaFim = document.getElementById('horaFim');
    const intervaloInput = document.getElementById('intervaloInput');
    if (horaInicio) horaInicio.value = '00:00';
    if (horaFim) horaFim.value = '00:00';
    if (intervaloInput) intervaloInput.value = '';
    const modoIntervalo = document.getElementById('modoIntervalo');
    if (modoIntervalo) modoIntervalo.checked = true;
    toggleModoCalculo();
    ocultarErro();

    const containerResultados = document.getElementById('containerResultados');
    const emptyState = document.getElementById('emptyState');

    if (containerResultados) {
        containerResultados.classList.add('d-none');
        containerResultados.classList.remove('d-flex');
    }
    if (emptyState) {
        emptyState.classList.remove('d-none');
    }

    currentPendingCalculation = null;
    currentResults = null;
}

/**
 * Imprimir a Grade
 */
function imprimirGrade() {
    window.print();
}
