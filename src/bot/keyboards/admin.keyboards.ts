import { Markup } from 'telegraf';
import { t } from '../../i18n/uz.js';

export const adminMainMenu = () => Markup.keyboard([t.menu.admin]).resize();
