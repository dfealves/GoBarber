import Sequelize, { Model } from 'sequelize';
import { isBefore, subHours } from 'date-fns';

class Appointment extends Model {
  static init(sequelize) {
    super.init(
      {
        date: Sequelize.DATE,
        canceled_at: Sequelize.DATE,
        past: {
          // Propriedade virtual não persiste na tabela
          type: Sequelize.VIRTUAL,
          get() {
            // retorna true caso horário já tenha passado
            return isBefore(this.date, new Date());
          },
        },
        cancelable: {
          type: Sequelize.VIRTUAL,
          // verifica se o horário atual é no mínimo 2 horas antes do agendamento
          get() {
            return isBefore(new Date(), subHours(this.date, 2));
          },
        },
      },
      { sequelize }
    );

    return this;
  }

  // Faz o relacionamento do campo user_id com a tabela User
  // N(agendamentos):1(usuario)
  // N(agendamentos):1(prestador de servico)
  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    this.belongsTo(models.User, { foreignKey: 'provider_id', as: 'provider' });
  }
}

export default Appointment;