/* eslint-disable class-methods-use-this */
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { Op } from 'sequelize';

import Appointment from '../models/Appointment';
import User from '../models/User';

class ScheduleController {
  async index(req, res) {
    // verifica se o usuario é um provider
    const checkUserProvider = await User.findOne({
      where: { id: req.userId, provider: true },
    });
    // se o usuario não for provider é exibida uma mensagem de erro
    if (!checkUserProvider) {
      return res.status(401).json({ error: 'User is not a provider' });
    }

    const { date } = req.query;
    const parsedDate = parseISO(date);
    // verificar agendamentos onde o prestador for o usuario logado, que não esteja cancelado e que a data esteja entre o começo e o final das datas enviadas como parametro
    const appointments = await Appointment.findAll({
      where: {
        provider_id: req.userId,
        canceled_at: null,
        date: {
          [Op.between]: [startOfDay(parsedDate), endOfDay(parsedDate)],
        },
      },
      order: ['date'],
    });

    return res.json(appointments);
  }
}

export default new ScheduleController();
