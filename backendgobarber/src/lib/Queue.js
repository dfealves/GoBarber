/* eslint-disable class-methods-use-this */
import Bee from 'bee-queue';
import CancellationMail from '../app/jobs/CancellationMail';
import redisConfig from '../config/redis';

// capturando todos os jobs da aplicação
const jobs = [CancellationMail];

class Queue {
  constructor() {
    // armazenando os jobs dentro da variavel queues
    this.queues = {};

    this.init();
  }

  init() {
    // o metodo handle vai processar o job
    jobs.forEach(({ key, handle }) => {
      this.queues[key] = {
        // armazena a fila que possui a conexão com o banco noSQL
        bee: new Bee(key, {
          redis: redisConfig,
        }),
        handle,
      };
    });
  }

  // queue = qual fila eu quero adicionar um novo job, job = ex: appointments e todas informações que serão armazenadas pelo handle()
  add(queue, job) {
    return this.queues[queue].bee.createJob(job).save();
  }

  processQueue() {
    jobs.forEach(job => {
      const { bee, handle } = this.queues[job.key];

      bee.on('failed', this.handleFailure).process(handle);
    });
  }

  handleFailure(job, err) {
    console.log(`Queue ${job.queue.name}: FAILED`, err);
  }
}

export default new Queue();
