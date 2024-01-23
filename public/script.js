
//script.js

// Check that service workers are supported
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => {
        console.log('Service worker registered.', reg);
      })
      .catch((error) => {
        console.log('Service worker registration failed:', error);
      });
  });
}

// Open IndexedDB database
let db;

const request = indexedDB.open('downloads', 1);

request.onupgradeneeded = function (event) {
  db = event.target.result;

  // Create object store to store downloaded files
  const objectStore = db.createObjectStore('downloads', { keyPath: 'id', autoIncrement: true });
};

request.onsuccess = function (event) {
  db = event.target.result;

  // Display downloaded files on page load
  displayDownloadedFiles();
  updateStorageUsage();
};

// Display downloaded files
function displayDownloadedFiles() {
  const transaction = db.transaction(['downloads'], 'readonly');
  const objectStore = transaction.objectStore('downloads');

  const request = objectStore.getAll();

  request.onsuccess = function (event) {
    const downloadedFiles = event.target.result;
    const downloadedFilesList = document.getElementById('downloaded-files');

    // Clear existing list
    downloadedFilesList.innerHTML = '';
    // Create a row for downloaded files
    const row = document.createElement('div');
    row.classList.add('downloaded-files-row');
    downloadedFilesList.appendChild(row);
    // Display each downloaded file with delete button
    downloadedFiles.forEach(function (file) {
      const listItem = document.createElement('li');
      listItem.classList.add('downloaded-item');
      //listItem.textContent = file.name;
      //downloadedFilesList.appendChild(listItem);

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.classList.add('delete-button');

      deleteButton.addEventListener('click', function () {
        deleteFile(file.id);
      });
      row.appendChild(listItem);
      row.appendChild(deleteButton);
      listItem.appendChild(deleteButton);

      // Check if the file is an audio
      if (file.name.endsWith('.mp3')) {
        const audioElement = document.createElement('audio');
        audioElement.controls = true;
        // Create a blob URL for the file
        const blobUrl = URL.createObjectURL(file.blob);
        audioElement.src = blobUrl;

        listItem.appendChild(audioElement);
      }

      // Check if the file is a video
      if (file.name.endsWith('.mp4')) {
        const videoElement = document.createElement('video');
        videoElement.src = URL.createObjectURL(file.blob);
        videoElement.controls = true;

        listItem.appendChild(videoElement);
      }

      downloadedFilesList.appendChild(listItem);
    });
  };
}
function updateStorageUsage() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(function (estimate) {
      // Log the storage estimate
      console.log('Current usage: ' + formatStorage(estimate.usage));
      console.log('Maximum available: ' + formatStorage(estimate.quota));
      // Check if the estimated quota is greater than or equal to 10GB
      if (estimate.quota >= 10 * 1024 * 1024 * 1024) {
        console.log('Your app can have 10GB of storage.');
      } else {
        console.log('Your app cannot have 10GB of storage.');
      }
    });
  } else {
    console.log('StorageManager API not supported.');
  }
}


function formatStorage(bytes) {
  if (bytes < 1024) {
    return bytes + ' bytes';
  } else if (bytes < 1024 * 1024) {
    return (bytes / 1024).toFixed(2) + ' KB';
  } else if (bytes < 1024 * 1024 * 1024) {
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  } else {
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }
}


// Function to delete a downloaded file
function deleteFile(id) {
  const transaction = db.transaction(['downloads'], 'readwrite');
  const objectStore = transaction.objectStore('downloads');

  const request = objectStore.delete(id);

  request.onsuccess = function () {
    // Refresh the list of downloaded files
    displayDownloadedFiles();
  };
}


// Function to handle file download


function downloadFile(url, name) {
  // Create the progress container div and append it to the body
  const progressContainer = document.createElement('div');
  progressContainer.classList.add('progress-container');

  // Create the progress bar
  const progressBar = document.createElement('progress');
  progressBar.classList.add('progress-bar');
  progressBar.value = 0;
  progressBar.max = 100;

  // Optionally, create a span for the progress text
  const progressText = document.createElement('span');
  progressText.classList.add('progress-text');
  progressText.textContent = 'Downloading...';

  // Append the progress bar and text to the progress container
  progressContainer.appendChild(progressBar);
  progressContainer.appendChild(progressText);

  // Append the progress container to the body
  document.body.insertBefore(progressContainer, document.body.firstChild);
  // Fetch the file
  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const contentLength = response.headers.get('content-length');
      if (!contentLength) {
        throw new Error('Content-Length response header unavailable');
      }
      const totalBytes = parseInt(contentLength, 10);
      let receivedBytes = 0;

      // Read the body stream incrementally
      const reader = response.body.getReader();
      const stream = new ReadableStream({
        start(controller) {
          function read() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              receivedBytes += value.length;
              progressBar.value = (receivedBytes / totalBytes) * 100;
              controller.enqueue(value);
              read();
            }).catch(error => {
              console.error('Stream reading error:', error);
              controller.error(error);
            });
          }
          read();
        }
      });

      return new Response(stream, { headers: { 'Content-Type': 'blob' } }).blob();
    })
    .then(blob => {
      // Save the downloaded file to IndexedDB
      const transaction = db.transaction(['downloads'], 'readwrite');
      const objectStore = transaction.objectStore('downloads');
      const file = { name, blob };
      const request = objectStore.add(file);
      request.onsuccess = function () {
        // Refresh the list of downloaded files
        displayDownloadedFiles();
        updateStorageUsage();
        // Update the progress bar with "Downloaded" message
        progressBar.value = 100;
        progressText.textContent = 'Downloaded';
        // Download is complete, hide the progress bar after 5 seconds
        setTimeout(() => {
          progressContainer.style.display = 'none';
        }, 1000); // 5000 milliseconds = 5 seconds
      };
    })
    .catch(error => {
      console.error('Download failed:', error);
      progressText.textContent = 'Download failed';
    });
}


// Function to handle download button click
function handleDownloadButtonClick(url, name) {
  downloadFile(url, name);
}


// Create media elements dynamically
const mediaContainer = document.getElementById('media-container');
// Create audio elements
const audioSources = ['media/audio1.mp3', 'media/audio2.mp3', 'media/audio3.mp3', 'media/audio4.mp3'];
const audioRow = document.createElement('div');
audioRow.classList.add('media-row');
audioSources.forEach((source) => {
  const audioContainer = document.createElement('div');
  audioContainer.classList.add('media-item');
  const audioElement = document.createElement('audio');
  audioElement.src = source;
  audioElement.controls = true;
  audioContainer.appendChild(audioElement);

  const audioDownloadButton = document.createElement('button');
  audioDownloadButton.textContent = 'Download Audio';
  audioDownloadButton.addEventListener('click', function () {
    handleDownloadButtonClick(source, source.split('/').pop());
  });
  audioContainer.appendChild(audioDownloadButton);
  audioRow.appendChild(audioContainer);
});

// Create video elements
const videoSources = ['media/video1.mp4', 'media/video2.mp4', 'media/video3.mp4', 'media/video4.mp4'];
const videoRow = document.createElement('div');
videoRow.classList.add('media-row');
videoSources.forEach((source) => {
  const videoContainer = document.createElement('div');
  videoContainer.classList.add('media-item');
  const videoElement = document.createElement('video');
  videoElement.src = source;
  videoElement.controls = true;
  videoElement.style.width = '200px'; // Set a fixed width
  videoElement.style.height = 'auto'; // Set a fixed height
  videoContainer.appendChild(videoElement);

  const videoDownloadButton = document.createElement('button');
  videoDownloadButton.textContent = 'Download Video';
  videoDownloadButton.addEventListener('click', function () {
    handleDownloadButtonClick(source, source.split('/').pop());
  });
  videoContainer.appendChild(videoDownloadButton);
  videoRow.appendChild(videoContainer);

});

// Append the rows to the media container

mediaContainer.appendChild(audioRow);
mediaContainer.appendChild(videoRow);

