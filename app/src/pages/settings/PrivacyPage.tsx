import { SubNavbar } from '@/components/shared/SubNavbar'

interface PrivacyPageProps {
  onBack: () => void
}

export default function PrivacyPage({ onBack }: PrivacyPageProps) {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      <SubNavbar title="隐私政策" onBack={onBack} />

      <div className="flex-1 overflow-auto px-4 py-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
          <div className="text-sm font-bold text-slate-800 mb-1">恒运出行隐私政策</div>
          <div className="text-xs text-slate-400 mb-4">更新日期：2026年7月1日</div>

          <div className="text-sm text-slate-600 leading-relaxed space-y-4">
            <section>
              <h3 className="font-semibold text-slate-700 mb-1">一、信息收集</h3>
              <p>1.1 我们收集的信息包括：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>注册信息：姓名、手机号码、公司名称</li>
                <li>位置信息：出发城市、出发地点（用于匹配车辆资源）</li>
                <li>订单信息：行程记录、支付记录</li>
                <li>设备信息：设备型号、操作系统版本、IP地址</li>
              </ul>
              <p>1.2 我们仅在为您提供服务所必需的范围内收集上述信息。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">二、信息使用</h3>
              <p>2.1 我们使用收集的信息用于以下目的：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>为您提供用车服务并完成订单</li>
                <li>向您发送订单状态通知</li>
                <li>改善和优化平台服务体验</li>
                <li>保障平台和用户的安全</li>
                <li>遵守法律法规的要求</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">三、信息共享</h3>
              <p>3.1 我们不会将您的个人信息出售给任何第三方。</p>
              <p>3.2 在以下情况下，我们可能会共享您的信息：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>经您明确同意后共享</li>
                <li>为完成服务需向承运方提供必要的乘车信息</li>
                <li>根据法律法规或行政司法机构要求</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">四、信息安全</h3>
              <p>4.1 我们采取业界通行的安全技术和措施保护您的信息安全，包括数据加密传输、访问控制、防火墙等。</p>
              <p>4.2 我们会定期审查信息安全措施，持续提升安全防护能力。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">五、用户权利</h3>
              <p>5.1 您有权访问、更正、删除您的个人信息。</p>
              <p>5.2 您有权撤回对信息收集的同意，但可能导致部分功能无法使用。</p>
              <p>5.3 您有权注销账户，注销后我们将删除或匿名化处理您的个人信息。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">六、Cookie 与同类技术</h3>
              <p>6.1 我们可能使用 Cookie 和类似技术来提升您的使用体验，包括记住登录状态、偏好设置等。</p>
              <p>6.2 您可以通过浏览器设置管理或禁用 Cookie。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">七、未成年人保护</h3>
              <p>7.1 我们的服务主要面向成年人。如果您是未成年人，请在监护人指导下使用本服务。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">八、政策更新</h3>
              <p>8.1 我们可能会不时更新本隐私政策，更新后的政策将在平台上公布。</p>
              <p>8.2 重大变更我们将通过平台通知、短信等方式告知您。</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-700 mb-1">九、联系我们</h3>
              <p>9.1 如您对本隐私政策有任何疑问或建议，请通过以下方式联系我们：</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>客服电话：400-xxx-xxxx</li>
                <li>电子邮箱：privacy@hengyun.com</li>
                <li>在线客服：平台内联系客服</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
