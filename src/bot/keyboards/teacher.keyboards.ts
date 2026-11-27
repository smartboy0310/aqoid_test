import { Markup } from 'telegraf';
import { t } from '../../i18n/uz.js';

export const teacherMainMenu = () => Markup.keyboard([t.menu.teacher]).resize();
