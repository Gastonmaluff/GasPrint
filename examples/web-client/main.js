const baseUrlInput = document.querySelector('#baseUrl');
const tokenInput = document.querySelector('#token');
const printerSelect = document.querySelector('#printer');
const textInput = document.querySelector('#text');
const output = document.querySelector('#output');

document.querySelector('#healthBtn').addEventListener('click', async () => {
  await showResponse(gasPrintFetch('/api/v1/health'));
});

document.querySelector('#printersBtn').addEventListener('click', async () => {
  const response = await gasPrintFetch('/api/v1/printers');
  await showResponse(Promise.resolve(response));
  if (response.ok) {
    const data = await response.clone().json();
    printerSelect.replaceChildren(
      ...data.printers.map((printer) => {
        const option = document.createElement('option');
        option.value = printer.name;
        option.textContent = `${printer.displayName} (${printer.kind})`;
        return option;
      })
    );
  }
});

document.querySelector('#printBtn').addEventListener('click', async () => {
  const payload = {
    printer: printerSelect.value,
    type: 'receipt',
    paperWidth: 58,
    source: 'examples-web-client',
    content: {
      title: 'GasPrint',
      lines: [
        {
          text: textInput.value,
          align: 'center',
          bold: true,
          size: 'normal'
        }
      ],
      feedLines: 4
    }
  };

  const response = await fetch(`${baseUrlInput.value}/api/v1/print`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenInput.value}`
    },
    body: JSON.stringify(payload)
  });

  await showResponse(Promise.resolve(response));
});

async function gasPrintFetch(path) {
  return fetch(`${baseUrlInput.value}${path}`, {
    headers: {
      Authorization: `Bearer ${tokenInput.value}`
    }
  });
}

async function showResponse(responsePromise) {
  try {
    const response = await responsePromise;
    const text = await response.text();
    output.textContent = `${response.status} ${response.statusText}\n\n${formatJson(text)}`;
  } catch (error) {
    output.textContent = error instanceof Error ? error.message : String(error);
  }
}

function formatJson(text) {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}