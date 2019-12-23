import { Sequelize } from 'sequelize';
import moongose from 'mongoose';
import databaseConfig from '../config/database';
import User from '../app/models/User';
import File from '../app/models/File';
import Appointment from '../app/models/Appointment';

const models = [User, File, Appointment];

class Database {
  constructor() {
    this.init();
    this.mongo();
  }

  init() {
    this.connection = new Sequelize(databaseConfig);
    // percorre os models e para cada model inicia a conexão
    models
      .map(model => model.init(this.connection))
      // percorre os models e  chamará para cada model, o model associate e o metodo só será chamado se o model. associate existir
      .map(model => model.associate && model.associate(this.connection.models));
  }

  mongo() {
    this.mongoConnection = moongose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useFindAndModify: true,
      useUnifiedTopology: true,
    });
  }
}

export default new Database();
