# 更新履歴

 - master/HEAD
 - 6.1.9 (2023.3.25)
   * 文字列選択時の動作を高速化（視覚的にインラインになっていないコンテナーを検知して、可能な限り早期に打ち切るようにした）
 - 6.1.8 (2023.3.24)
   * 文字列選択時の動作を高速化（選択範囲の前後のテキストの探索を、ブロックレベルのコンテナーの切り替わりを検知して、可能な限り早期に打ち切るようにした）
 - 6.1.7 (2023.1.7)
   * 事実上のインライン要素で区切られたURL文字列を受け付けるように↓（例：Twitter上でのスクリーンネームのリンクを含むURL文字列）
   * 要素ノードの可視性を確認する処理を高速化
   * 有効なTLDのリストを更新（[public suffix list](https://publicsuffix.org/)を使用）
 - 6.1.6 (2021.12.21)
   * キー操作に対する反応をkeyupではなくkeydownのタイミングで行うようにした（この変更により、Enterの直後にURLを含む文字列をCtrl-Vで貼り付けた場合のCtrl-Enterとの誤認を防ぎます）
   * 有効なTLDのリストを更新（[public suffix list](https://publicsuffix.org/)を使用）
 - 6.1.5 (2021.11.5)
   * 長いURI文字列が選択されているときに、その選択範囲よりも前に、そのURI文字列の一部と一致するURIがある場合の、部分的なURIと長いURIの両方が選択範囲から見つかったURIとして列挙されてしまう問題を修正
 - 6.1.4 (2021.11.4)
   * コンテキストメニューからの操作において選択範囲からのURIの検出に失敗する場合があったのを修正
 - 6.1.3 (2021.10.25)
   * コンテキストメニューの項目が機能していなかったのを修正（by [gontazaka](https://github.com/gontazaka), thanks!）
 - 6.1.2 (2020.5.5)
   * 既知のトップレベルドメインの情報ソースとして[public suffix list](https://publicsuffix.org/)を使うようにした（URLらしき文字列について、ホスト名部分のトップレベルドメインがこのリストに記載されている物であればURLとして識別するようにした）
   * 「すべての設定」のUIの不備を改善：インポートした設定をUIに即座に反映し、また、数値型の一部の設定項目で小数が不正な値として警告されてしまわないようにした
 - 6.1.1 (2020.6.8)
   * テキスト入力欄でのキー入力操作が意図せず激遅になっていたのを修正
 - 6.1.0 (2020.3.10)
   * 選択範囲の上でのコンテキストメニューコマンドのラベルが見えなくなっていたのを修正
   * Firefoxの最近のバージョンで設定画面が機能しなくなっていたのを修正
   * Firefox 63以前のサポートを終了
 - 6.0.3 (2019.8.8)
   * Firefox 70で廃止される古いコードを削除
   * キーボードショートカットを除く全設定のインポートとエクスポートに対応（設定→開発用→デバッグモード→すべての設定→Import/Export）
 - 6.0.2 (2018.7.30)
   * URIを選択する処理を最適化（従来版では、Webページ内に大量のノードがある場合に処理に時間がかかりすぎる場合があった）
   * クリックされたURIの処理中にWebページの内容が改変された場合でも、そのURIを開けるようにした
   * 設定をFirefox Syncで同期するようにした
 - 6.0.1 (2017.11.4)
   * 選択範囲からURI文字列を検出する処理を高速化（必要が生じるまでは実際のRangeを検索しないようにした）
 - 6.0.0 (2017.11.3)
   * WebExtensionsベースで作り直した
   * Thunderbirdへの対応を終了
 - 5.0.2016031501
   * Nightly 48.0a1対応
   * 設定を専用の名前空間の下で管理するようにした
   * 「〜をタブで開く」が即座に実行された場合でもすべての処理対象URIを正しく開くように修正
   * plロケール更新 ([by Piotr Drąg, thanks!](https://github.com/piroor/textlink/pull/52))
   * 選択範囲にURIが存在しない場合に、コンテキストメニューの項目を正しく無効化するように修正
   * コンテキストメニュー内の無効化されたメニュー項目に対してツールチップを表示しないようにした
 - 5.0.2015060501
   * マルチプロセスモード（E10S）に対応
   * hy-AM（アルメニア語）ロケールを追加（by [Hrant Ohanyan](http://haysoft.org). Thanks!）
 - 4.1.2013040601
   * 選択範囲を自動的に広げる処理が期待通りに動かない場合があったのを修正
   * jarファイルを含めない形のパッケージングに変更
 - 4.1.2012122901
   * Nightly 20.0a1に対応
   * Firefox 9およびそれ以前のバージョンへの対応を終了
   * コンテキストメニューを開いた時に、選択範囲の中に含まれるURIを少しずつ検索するようにした（これにより、メニューを開くときにフリーズしてしまうということがなくなった）
   * ポート番号を含むURIもURIとして認識するようにした
   * 1つのURI文字列だけを選択していたときに、正しく現在のタブに読み込むようにした
   * いくつかのエッジケースで選択範囲からのURIの認識に失敗していたのを修正
 - 4.0.2011021601
   * ユーザが設定を変更していた場合に設定の移行に失敗していたのを修正
 - 4.0.2011021301
   * IDNの解釈を有効にするスキームを明示的に指定できるようにした
   * 初期状態でdata: URIを検出するようにした
   * 「ユーザ名:パスワード@ドメイン名」形式のURLを受け付けなくなっていたのを修正
   * about: URIやchrome: URLなどの、妥当なTLDを含まないURIを検出できなくなっていたのを修正
   * テキスト入力欄の中でコンテキストメニューの項目が表示されなくなっていたのを修正
   * テキスト入力欄を含む選択範囲からのURI文字列の検索に失敗していたのを修正
 - 4.0.2011020501
   * Minefieldで選択範囲のURIをまとめてタブで開く機能が動作しなくなっていたのを修正
 - 4.0.2011012101
   * Minefield 4.0b10pre対応
   * Firefox 3.0以前への対応を終了
   * Thunderbird 3.1対応
   * Thunderbird 2以前への対応を終了
   * IDN（国際化ドメイン）を認識できるようにした
   * ページ内で何も選択していない時は、コンテキストメニューを開く時に何も処理を行わないようにした
   * ドイツ語ロケール追加（by Michael Baer）
 - 3.1.2009110201
   * 内部に保持しているTLDのリストを更新
   * Enterキー以外のキー入力を無視するようにした
   * より安全なコードに修正
   * フランス語ロケール更新 (by menet)
   * トルコ語ロケール更新 (by Anıl Yıldız)
 - 3.1.2009032701
   * URI文字列の後の開き括弧がURIの一部として認識されてしまっていたのを修正
   * ThunderbirdがURIであると誤判定した箇所を通常のテキストに戻す処理について、見落としてしまうケースがいくつかあったのを修正
 - 3.1.2009032601
   * Thunderbirdでも利用できるようにした
   * 「URL:http://……」と言った形で書かれたURIを正しく認識できない問題を修正
   * zh-TWロケール更新（by Alan CHENG）
 - 3.0.2009031801
   * 処理を高速化
 - 3.0.2009031701
   * Firefox 3で処理を高速化
   * ツールチップが消えた後もツールチップの内容の更新が続いていたのを、処理を停止するようにした
   * 連続するインライン要素以外はテキストの切れ目として認識するようにした
 - 3.0.2009030901
   * Firefox 2で正しく動作しなくなっていたのを修正
   * プレーンテキストでクリック位置からURIを検出できなくなっていたのを修正
   * コンテキストメニューの初期化にかかる時間を短縮した（正確さを犠牲にして処理速度を向上した）
 - 3.0.2009022402
   * ページの長さに比例して処理速度が大幅に低下してしまっていたのを修正
   * 選択範囲外のURI文字列がヒットする可能性があったのを修正
 - 3.0.2009022401
   * テキストファイルでクリック位置の前後のテキストの検出に失敗していたのを修正（単一のテキストノードの場合、検索範囲がテキストノードの前に設定されていなかった）
   * 非表示のテキストを含むページで、選択した位置のURIを正しく認識できない場合があったのを修正
   * 全角文字で書かれたURIについて、\u301c（波ダッシュ）と\uff5e（全角チルダ）の両方とも「~」として受け付けるようにした
 - 3.0.2009021901
   * www.やftp.で始まるドメイン名の補完ルールの初期設定を修正
   * トルコ語ロケール更新 (by Anıl Yıldız)
 - 3.0.2009021801
   * テキストノードが細かく分割されている場所で処理に時間がかかっていたのを修正
 - 3.0.2009021601
   * 選択範囲のURIを開く機能をテキスト入力欄の中でも使えるようにした
   * GMailのメール編集画面でコンテキストメニューを開こうとするとフリーズする問題を修正（URI文字列の検索の際に、head要素、script要素などの内容は除外するようにした）
 - 3.0.2009021502
   * URI文字列の後に強制改行と英数字文字列が連続している時に、改行以後の英数字文字列がURIの一部として認識されてしまっていたのを修正
   * 相対パスの解釈が無効な時は、ドメイン名などの前に書かれた文字のうち、URI文字列の先頭に登場し得ない文字を無視するようにした
   * フランス語ロケール更新 (by menet)
 - 3.0.2009021401
   * 選択範囲のURI文字列をまとめてクリップボードにコピーする機能を追加
   * クリックした位置のURI文字列をクリップボードにコピーする機能を追加
   * Firefox 3以降の複数に分割された選択範囲に対応
   * コンテキストメニューの項目の上で、選択されている全てのURIをツールチップで表示するようにした
   * クリック位置のURI文字列を選択する処理について、前後の括弧などを除外するようにした
 - 2.1.2009021301
   * Firefox 2より前のバージョンへの対応を終了
   * 設定ダイアログをFirefox向けに全面的に書き直した
 - 2.0.2008052801
   * アクションに対する機能の割り当てを初期状態にすぐに戻せるようにした
   * コンテキストメニューの機能が動かなくなっていたのを修正
   * フランス語ロケール更新 (by BlackJack)
   * トルコ語ロケール追加 (by Anıl Yıldız)
 - 2.0.2008052701
   * ハンガリー語ロケール追加 (by Mikes Kaszmán István)
   * フランス語ロケール更新 (by menet)
 - 2.0.2008052601
   * スキーマ部分を省略したURIの読み込みに失敗する場合があったのを修正
   * 選択範囲のURI文字列を開く際、重複分は開かないようにした
 - 2.0.2008050601
   * 台湾中国語ロケール更新
 - 2.0.2008042801
   * 古いFirefox用のコードを一部削除
 - 2.0.2007111301
   * イタリア語ロケール更新
 - 2.0.2007111201
   * イタリア語ロケールのDTDエラーを修正
 - 2.0.2007111103
   * イタリア語ロケールが正しく認識されていなかったのを修正
   * アドオンマネージャ用のアイコンを追加（元デザイン：Marco C.）
 - 2.0.2007111102
   * イタリア語ロケール追加（by Marco C.）
 - 2.0.2007111101
   * 複数のアクションを設定できるようにした
   * Minefield対応
 - 1.3.2007110501
   * 台湾中国語ロケール追加（by Alan CHENG）
 - 1.3.2007103002
   * GMailやGoogle Docsなどのリッチテキストエリアに対しては反応しないようにした
 - 1.3.2007103001
   * 中国語ロケール追加（by Carlos Oliveira）
 - 1.3.2007102201
   * [ツリー型タブ](http://piro.sakura.ne.jp/xul/_treestyletab.html)のAPIを利用して連携するようにした
 - 1.3.2006100702
   * Firefox 2.0 の大量のタブを開く前の警告に対応
 - 1.3.2006100701
   * Firefox 2.0 のタブのオーナー機能に対応
 - 1.3.20060328
   * フランス語の言語パックを修正（by menet）
 - 1.3.2006032701
   * URI文字列を選択するのみの「選択モード」を加えた
   * URI文字列を選択する時、前後の余計な文字列まで選択されたままになってしまうことがあったのを修正
 - 1.3.2006032601
   * Find As You TypeでURI文字列の一部が選択された状態やキャレットブラウズモードでURI文字列の中にカーソルがある場合において、EnterキーでURI文字列を読み込めるようにした
   * 相対パスの解釈を有効にしているとき、コンテキストメニューの項目の初期化に失敗することがあったのを修正
 - 1.3.2006031401
   * 選択範囲のURI文字列をコンテキストメニューから開く場合、部分選択されたURIも常に含めるようにした
   * 相対パスの解釈を有効にしているとき、スペースを空けてURI文字列の前に書かれた語句までURIの一部と見なすことがあった問題を修正
   * フランス語の言語パックを同梱した（made by menet）
 - 1.3.2006031301
   * 動作モードの設定を正しく保存・読み込みできなくなっていたのを修正
   * 相対パスと全角文字の解釈を同時に有効にするとURIの検出に失敗することがあったのを修正
   * タブを開く設定の時、常に全面のタブで開かれていたのを修正
 - 1.3.2006031201
   * 補完するパターンにワイルドカード（*、?）を使えるようにした（パターンを書き換えている場合、「初期値に戻す」ボタンをクリックしてください）
   * スキーマを省略されて「www」などから始まるURI文字列も補完できるようにした（パターンを書き換えている場合、「初期値に戻す」ボタンをクリックしてください）
   * 括弧を含むURIの認識精度を少し改善
   * 全角文字を半角文字に置換する処理のアルゴリズムを高速化した（based on implementation written by [Taken](http://taken.s101.xrea.com/blog/article.php?id=510)）
   * 設定パネルの構成を変更
   * デフォルトの設定を変更
 - 1.3.2006031001
   * 英語の言語パックのミスを修正
   * 複数のURI文字列を選択したときのコンテキストメニュー項目のラベルがおかしくなっていたのを修正
   * 「h**p」「h++p」などの形でエスケープ（？）されたURI文字列も解釈できるようにした
   * 解釈するスキーマなどの設定を、カンマ以外の文字でも区切れるようにした
 - 1.3.2006030901
   * 単純なダブルクリックだけではなく、Ctrlキーなどとの組み合わせもトリガーとして設定できるようにした
   * 新しいタブをフォアグラウンドで開くかバックグラウンドで開くかに関する設定の実装方法を変えた
   * 長いページでコンテキストメニューの展開やクリック位置の検出に時間がかかる問題を修正
   * 隠し設定でURI検索範囲の大きさを指定できるようにした（textlink.find_range_size）
 - 1.3.2006022101
   * 右クリック時のコンテキストメニューの内容を少し変更
 - 1.3.2005121301
   * クリック位置の検出を緩く判定するようにすると、却って判定が厳しくなってしまっていたのを修正
 - 1.3.2005070402
   * クリックしたURI文字列を読み込めない問題を修正
   * ダブルクリックでURI文字列をタブで開いたときに、URI文字列を選択するようにした
 - 1.3.2005070401
   * クリックしたURI文字列を読み込めないケースがあったのを修正
 - 1.3.2005062901
   * 一部のページでクリックしたURI文字列を読み込めないことがあったのを修正
 - 1.3.2005062801
   * XUL/Migemoを参考に、URI文字列が複数のノードに分割されていても一続きのURI文字列として認識できるようにした
 - 1.2.2005041901
   * よりセキュアな方法で内容領域へアクセスするようにした
 - 1.2.2005021001
   * URI文字列の検出処理を改善した
 - 1.2.2005020901
   * 選択範囲に含まれるURI文字列を一気に開く機能を加えた
 - 1.1.2005012901
   * 最新のMozillaでブラウザのChrome URLを取得できない問題を修正
 - 1.1.2004121601
   * 初期化処理・終了処理が正しく行われないことがある問題を修正
   * Movable Type 3.0の管理画面などにおいて処理に失敗する可能性があったのを修正
 - 1.1.2004090301
   * 設定パネルを作り直した
   * 全角英数文字も解釈できるようにした
 - 1.0.2004083102
   * 相対パスの検索・解決方法を改善したつもり
 - 1.0.2004083101
   * 括弧やピリオドなど、URL先頭・末尾の特定の文字を無視するようにした
 - 1.0.2004080701
   * スキーマの補完テーブルの最初の項目しか適用されない問題を修正
 - 1.0.2004080201
   * 相対パスの解釈とスキーマの補完を別々に設定できるようにした
 - 1.0.2004041101
   * URI文字列の検索処理を少し改善
 - 1.0.2004021703
   * リファラのブロック機能のチェックボックスの状態が保存されない問題を修正
 - 1.0.2004021702
   * リファラのブロック機能が働いていなかったのを修正
 - 1.0.2004021701
   * 公開
