/* eslint-disable no-unused-vars */
/* eslint-disable class-methods-use-this */
import * as Yup from 'yup';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import pt from 'date-fns/locale/pt';
import User from '../models/User';
import Appointment from '../models/Appointment';
import File from '../models/File';
import Notification from '../schemas/Notification';

import CancellationMail from '../jobs/CancellationMail';
import Queue from '../../lib/Queue';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;

    const appointments = await Appointment.findAll({
      where: { user_id: req.userId, canceled_at: null },
      order: ['date'],
      attributes: ['id', 'date', 'past', 'cancelable'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

  // validaçoes
  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    // se não passar na validação sera retornada msg de erro
    if (!(await schema.isValid(req.body))) {
      return res.status(401).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    /**
     * Check if provider_id is a provider
     */
    // captura o usuario que seja provider
    const checkIsProvider = await User.findOne({
      where: {
        id: provider_id,
        provider: true,
      },
    });
    // se o usuario não for um user, será exibida msg de erro
    if (!checkIsProvider) {
      return res
        .status(401)
        .json({ error: 'You can only create a appointments with providers' });
    }
    /** verificando datas passadas
     * parseISO tranforma a string de data em um objeto date do js
     * starOfHour sempre vai capturar a hora inteira, sem minutos e segundos
     */
    const hourStart = startOfHour(parseISO(date));
    /**
     * verifica se o hourStart, está antes da data atual
     */
    if (isBefore(hourStart, new Date())) {
      // se a data já tiver passada é emitida msg de erro
      return res.status(400).json({ error: 'Past dates are not permited' });
    }

    /**
     * verificando datas disponíveis
     */
    const checkAvailabilidy = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailabilidy) {
      return res
        .status(400)
        .json({ error: 'Appointment date is not available' });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    /**
     * notify appointment provider
     */
    const user = await User.findByPk(req.userId);
    const formattedDate = format(
      hourStart,
      "'dia' dd 'de' MMMM', às' H:mm'h'",
      { locale: pt }
    );

    if (provider_id === req.userId) {
      return res.status(400).json({
        error: 'User provider cannot create an appointment with himself',
      });
    }
    await Notification.create({
      content: `Novo agendamendo de ${user.name} para ${formattedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: "You don't have permition to cancel this appointment",
      });
    }
    //
    const dateWithSub = subHours(appointment.date, 2);
    /**
     * 13:00 hora do appointment
     * dateWithSub = 11h
     * now 11:25 don't be possible to cancel appointment
     */

    if (isBefore(dateWithSub, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointments 2 hours in advance.',
      });
    }
    // data do cancelamento
    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return res.json(appointment);
  }
}

export default new AppointmentController();
