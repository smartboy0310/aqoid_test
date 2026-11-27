import { Markup } from 'telegraf';
import { t } from '../../i18n/uz.js';

export const studentMainMenu = () => Markup.keyboard([t.menu.student]).resize();
